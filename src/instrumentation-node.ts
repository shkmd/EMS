import cron from "node-cron"

import { checkExpiringSubscriptions } from "@/features/subscriptions/reminders"

// Once daily at 03:30 UTC (~09:00 IST, this company's default timezone) —
// check for subscriptions renewing in exactly 7 days and send reminders.
// Safe to re-run on container restart: reminderSentAt dedupes sends.
export function registerSubscriptionReminderScheduler() {
  cron.schedule("30 3 * * *", async () => {
    try {
      const result = await checkExpiringSubscriptions()
      console.info("[subscriptions] Daily reminder check:", result)
    } catch (error) {
      console.error("[subscriptions] Daily reminder check failed:", error)
    }
  })

  console.info("[subscriptions] Daily reminder scheduler registered")
}
