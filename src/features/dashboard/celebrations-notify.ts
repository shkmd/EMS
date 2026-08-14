import "server-only"

import { prisma } from "@/lib/prisma"
import { sendPushToUser } from "@/lib/push"

function isTodayMonthDay(date: Date, now: Date) {
  return date.getUTCMonth() === now.getUTCMonth() && date.getUTCDate() === now.getUTCDate()
}

/** Notifies the whole company (in-app + push only — deliberately no email
 * or WhatsApp, so a daily "it's someone's birthday" doesn't turn into an
 * inbox/phone spam habit) whenever it's an active employee's birthday or
 * work anniversary today. Meant to be called once a day. */
export async function notifyTodaysCelebrations() {
  const now = new Date()

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, dob: true, dateOfJoining: true },
  })

  const birthdays = employees.filter((e) => e.dob && isTodayMonthDay(e.dob, now))
  const anniversaries = employees.filter(
    (e) => isTodayMonthDay(e.dateOfJoining, now) && e.dateOfJoining.getUTCFullYear() < now.getUTCFullYear()
  )

  if (birthdays.length === 0 && anniversaries.length === 0) {
    return { birthdaysNotified: 0, anniversariesNotified: 0 }
  }

  const audience = await prisma.user.findMany({
    where: { isActive: true, employee: { deletedAt: null, status: "ACTIVE" } },
    select: { id: true },
  })
  if (audience.length === 0) return { birthdaysNotified: 0, anniversariesNotified: 0 }

  const link = "/dashboard#celebrations"
  const messages = [
    ...birthdays.map((e) => ({ title: "🎉 Birthday today", body: `It's ${e.firstName} ${e.lastName}'s birthday today!` })),
    ...anniversaries.map((e) => {
      const years = now.getUTCFullYear() - e.dateOfJoining.getUTCFullYear()
      return {
        title: "🎉 Work anniversary today",
        body: `${e.firstName} ${e.lastName} is celebrating ${years} year${years === 1 ? "" : "s"} at the company today!`,
      }
    }),
  ]

  for (const msg of messages) {
    await prisma.notification
      .createMany({ data: audience.map((u) => ({ userId: u.id, type: "INFO" as const, title: msg.title, message: msg.body, link })) })
      .catch((error) => console.error("[celebrations] Failed to create in-app notifications:", error))

    await Promise.all(
      audience.map((u) => sendPushToUser(u.id, { title: msg.title, body: msg.body, url: link }).catch((error) =>
        console.error("[celebrations] Failed to send push:", error)
      ))
    )
  }

  return { birthdaysNotified: birthdays.length, anniversariesNotified: anniversaries.length }
}
