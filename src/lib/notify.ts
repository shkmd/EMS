import "server-only"

import { prisma } from "@/lib/prisma"
import { getEnv } from "@/config/env"
import { sendMail, portalNotificationEmailTemplate } from "@/lib/mail"
import { sendWhatsApp } from "@/lib/whatsapp"
import { sendPushToUser } from "@/lib/push"

/**
 * Fans a notification out across every channel a user might see it on:
 * in-app, email, WhatsApp (if their linked employee record has a mobile
 * number), and browser push (if they've enabled it on a device). Each
 * channel is independent and best-effort — one failing (or being
 * unconfigured, like WhatsApp without Twilio credentials) never blocks the
 * others. Used by every feature that notifies a user about something
 * (leave, expenses, performance, projects, announcements, payroll).
 */
export async function notifyUser(userId: string, employeeId: string | null, title: string, message: string, link: string) {
  await prisma.notification
    .create({ data: { userId, employeeId, type: "INFO", title, message, link } })
    .catch((error) => console.error("Failed to create in-app notification:", error))

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, isActive: true } })
  if (user?.isActive) {
    const env = getEnv()
    await sendMail({
      to: user.email,
      ...portalNotificationEmailTemplate(title, message, `${env.NEXT_PUBLIC_APP_URL}${link}`),
    }).catch((error) => console.error("Failed to send notification email:", error))
  }

  if (employeeId) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { mobile: true } })
    if (employee?.mobile) {
      await sendWhatsApp(employee.mobile, `${title}\n\n${message}`).catch((error) =>
        console.error("Failed to send notification WhatsApp:", error)
      )
    }
  }

  await sendPushToUser(userId, { title, body: message, url: link }).catch((error) =>
    console.error("Failed to send notification push:", error)
  )
}
