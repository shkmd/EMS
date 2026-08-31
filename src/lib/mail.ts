import nodemailer from "nodemailer"

import { getEnv } from "@/config/env"
import { prisma } from "@/lib/prisma"
import { decryptSecret } from "@/features/settings/lib/crypto"

type ResolvedMailConfig = {
  host: string | null
  port: number
  secure: boolean
  user: string | null
  password: string | null
  fromName: string
  fromEmail: string
}

/**
 * Admin-configured Email Settings (Module 14) take precedence over env vars
 * when a host is set there; otherwise falls back to env vars, which is what
 * every environment ran on before that settings screen existed. Any DB
 * error (e.g. migrations not yet run) falls back to env vars too, so a
 * settings-table hiccup can never break password-reset emails.
 */
async function resolveMailConfig(): Promise<ResolvedMailConfig> {
  const env = getEnv()

  try {
    const dbSettings = await prisma.emailSettings.findUnique({ where: { id: 1 } })
    if (dbSettings?.smtpHost) {
      return {
        host: dbSettings.smtpHost,
        port: dbSettings.smtpPort ?? 587,
        secure: dbSettings.smtpSecure,
        user: dbSettings.smtpUser,
        password: dbSettings.smtpPasswordEnc ? decryptSecret(dbSettings.smtpPasswordEnc) : null,
        fromName: dbSettings.fromName ?? env.SMTP_FROM_NAME,
        fromEmail: dbSettings.fromEmail ?? env.SMTP_FROM_EMAIL,
      }
    }
  } catch (error) {
    console.error("Failed to read email settings, falling back to env vars:", error)
  }

  return {
    host: env.SMTP_HOST ?? null,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER ?? null,
    password: env.SMTP_PASSWORD ?? null,
    fromName: env.SMTP_FROM_NAME,
    fromEmail: env.SMTP_FROM_EMAIL,
  }
}

function buildTransporter(config: ResolvedMailConfig) {
  if (!config.host) {
    // No SMTP configured (e.g. local development) — log emails instead of
    // sending, so the rest of the auth flow can still be exercised.
    return nodemailer.createTransport({ jsonTransport: true })
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.password ?? undefined } : undefined,
    // Raw SMTP ports (25/465/587/2525) are blocked outbound on some hosts
    // (confirmed on Railway — every SMTP port times out there). Without an
    // explicit timeout, nodemailer's default is minutes long, so a blocked
    // network turns into a multi-minute hang on whatever request sent the
    // email instead of a fast, visible failure.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  })
}

/**
 * SendGrid's SMTP relay is blocked outbound on some hosts (e.g. Railway
 * blocks all SMTP ports for abuse prevention), so SendGrid is sent over its
 * HTTPS API instead — same API key, just not raw SMTP. The SMTP "password"
 * field already holds that API key (SendGrid's SMTP convention is
 * username="apikey", password=<the real API key>), so no separate secret
 * is needed.
 */
async function sendViaSendGridApi(config: ResolvedMailConfig, input: SendMailInput) {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.password}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: input.to }] }],
      from: { email: config.fromEmail, name: config.fromName },
      subject: input.subject,
      content: [
        { type: "text/plain", value: input.text },
        { type: "text/html", value: input.html },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`SendGrid API error (${res.status}): ${body}`)
  }
}

type SendMailInput = {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendMail(input: SendMailInput) {
  const config = await resolveMailConfig()

  if (config.host === "smtp.sendgrid.net" && config.password) {
    return sendViaSendGridApi(config, input)
  }

  const transporter = buildTransporter(config)

  const info = await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  if (!config.host) {
    console.info(`[mail] SMTP not configured — email logged instead of sent:\n`, JSON.stringify(info))
  }

  return info
}

export function passwordResetEmailTemplate(resetUrl: string) {
  return {
    subject: "Reset your EMS password",
    text: `We received a request to reset your password. Open this link to choose a new one (valid for 1 hour): ${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>We received a request to reset your password. This link is valid for 1 hour.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;border-radius:6px;text-decoration:none;">Reset password</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  }
}

export function portalAccessGrantedEmailTemplate(loginUrl: string, email: string, temporaryPassword: string) {
  return {
    subject: "Your EMS portal access is ready",
    text: `An account has been created for you on EMS.\n\nEmail: ${email}\nTemporary password: ${temporaryPassword}\n\nLog in here: ${loginUrl}\n\nYou'll be asked to set your own password on first login.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Your EMS portal access is ready</h2>
        <p>An account has been created for you. Use these credentials to log in — you'll be asked to set your own password on first login.</p>
        <p><strong>Email:</strong> ${email}<br/><strong>Temporary password:</strong> <code>${temporaryPassword}</code></p>
        <p><a href="${loginUrl}" style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;border-radius:6px;text-decoration:none;">Log in to EMS</a></p>
      </div>
    `,
  }
}

export function portalNotificationEmailTemplate(title: string, message: string, actionUrl: string) {
  return {
    subject: title,
    text: `${message}\n\nReview it in EMS: ${actionUrl}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>${title}</h2>
        <p>${message}</p>
        <p><a href="${actionUrl}" style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;border-radius:6px;text-decoration:none;">Review in EMS</a></p>
      </div>
    `,
  }
}
