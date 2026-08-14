import "server-only"

import { getEnv } from "@/config/env"

/**
 * Sends a WhatsApp message via Twilio. Mirrors sendMail's fallback in
 * src/lib/mail.ts: if Twilio isn't configured (no account SID/token/sender),
 * logs the message instead of throwing, so an unconfigured channel never
 * breaks the rest of a reminder fan-out.
 */
export async function sendWhatsApp(to: string, body: string) {
  const env = getEnv()

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_WHATSAPP_FROM) {
    console.info(`[whatsapp] Twilio not configured — message logged instead of sent:\n`, { to, body })
    return null
  }

  const toAddress = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`

  const params = new URLSearchParams({
    From: env.TWILIO_WHATSAPP_FROM,
    To: toAddress,
    Body: body,
  })

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      },
      body: params,
    }
  )

  if (!res.ok) {
    const errorText = await res.text()
    console.error(`[whatsapp] Twilio send failed (${res.status}):`, errorText)
    return null
  }

  return res.json()
}

export function subscriptionExpiryWhatsAppMessage(name: string, endDate: string) {
  return `EMS reminder: your subscription "${name}" renews/expires on ${endDate} (7 days from now). Review it in the portal under Subscriptions.`
}
