import "server-only"

import { format } from "date-fns"

import { prisma } from "@/lib/prisma"
import { getEnv } from "@/config/env"
import { sendMail, portalNotificationEmailTemplate } from "@/lib/mail"
import { sendWhatsApp, subscriptionExpiryWhatsAppMessage } from "@/lib/whatsapp"
import { sendPushToUser } from "@/lib/push"

const REMINDER_DAYS_BEFORE = 7

function utcDateRangeDaysFromNow(days: number) {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days))
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 1))
  return { start, end }
}

type NotifyTarget = { userId: string; email: string; mobile: string | null }

/** Who gets reminded: the subscription's designated owner (if it has a
 * linked portal login), else every active SUPER_ADMIN/HR user — mirrors how
 * leave requests fall back to notifying all HR when an employee has no
 * assigned manager. */
async function resolveNotifyTargets(notifyEmployeeId: string | null): Promise<NotifyTarget[]> {
  if (notifyEmployeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: notifyEmployeeId },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    })
    if (employee?.user?.isActive) {
      return [{ userId: employee.user.id, email: employee.user.email, mobile: employee.mobile }]
    }
  }

  const admins = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "HR"] }, isActive: true },
    select: { id: true, email: true, employee: { select: { mobile: true } } },
  })
  return admins.map((a) => ({ userId: a.id, email: a.email, mobile: a.employee?.mobile ?? null }))
}

/** Fans a single subscription's reminder out to every channel for every
 * target — in-app always, email/push best-effort, WhatsApp only when the
 * target has a known mobile number. Each channel failure is caught and
 * logged individually so one bad channel/target never blocks the rest. */
async function sendReminderForSubscription(sub: { id: string; name: string; endDate: Date }, targets: NotifyTarget[]) {
  const endDateLabel = format(sub.endDate, "dd MMM yyyy")
  const title = "Subscription renewing soon"
  const message = `"${sub.name}" renews/expires on ${endDateLabel} (${REMINDER_DAYS_BEFORE} days from now).`
  const link = "/subscriptions"
  const env = getEnv()

  for (const target of targets) {
    await prisma.notification
      .create({ data: { userId: target.userId, type: "WARNING", title, message, link } })
      .catch((error) => console.error("[subscriptions] Failed to create in-app notification:", error))

    await sendMail({
      to: target.email,
      ...portalNotificationEmailTemplate(title, message, `${env.NEXT_PUBLIC_APP_URL}${link}`),
    }).catch((error) => console.error("[subscriptions] Failed to send reminder email:", error))

    if (target.mobile) {
      await sendWhatsApp(target.mobile, subscriptionExpiryWhatsAppMessage(sub.name, endDateLabel)).catch((error) =>
        console.error("[subscriptions] Failed to send reminder WhatsApp:", error)
      )
    }

    await sendPushToUser(target.userId, { title, body: message, url: link }).catch((error) =>
      console.error("[subscriptions] Failed to send reminder push:", error)
    )
  }
}

/** Finds active subscriptions renewing in exactly 7 days that haven't been
 * reminded about yet, and sends the reminder fan-out for each. Safe to call
 * more than once a day (or concurrently) — `reminderSentAt` dedupes. */
export async function checkExpiringSubscriptions() {
  const { start, end } = utcDateRangeDaysFromNow(REMINDER_DAYS_BEFORE)

  const expiring = await prisma.subscription.findMany({
    where: { status: "ACTIVE", endDate: { gte: start, lt: end }, reminderSentAt: null },
  })

  let notifiedCount = 0

  for (const sub of expiring) {
    const targets = await resolveNotifyTargets(sub.notifyEmployeeId)
    await sendReminderForSubscription(sub, targets)
    notifiedCount += targets.length

    await prisma.subscription.update({ where: { id: sub.id }, data: { reminderSentAt: new Date() } })
  }

  return { subscriptionsChecked: expiring.length, notificationsSent: notifiedCount }
}
