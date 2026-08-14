import cron from "node-cron"

import { checkExpiringSubscriptions } from "@/features/subscriptions/reminders"
import { notifyTodaysCelebrations } from "@/features/dashboard/celebrations-notify"
import { nudgeMissingCheckIns } from "@/features/attendance/nudge"

export function registerSchedulers() {
  // Once daily at 03:30 UTC (~09:00 IST, this company's default timezone) —
  // check for subscriptions renewing in exactly 7 days and send reminders.
  // Safe to re-run on container restart: reminderSentAt dedupes sends.
  cron.schedule("30 3 * * *", async () => {
    try {
      const result = await checkExpiringSubscriptions()
      console.info("[subscriptions] Daily reminder check:", result)
    } catch (error) {
      console.error("[subscriptions] Daily reminder check failed:", error)
    }
  })

  // Once daily at 03:35 UTC — birthday/work-anniversary company-wide
  // notification (in-app + push only, see celebrations-notify.ts for why).
  cron.schedule("35 3 * * *", async () => {
    try {
      const result = await notifyTodaysCelebrations()
      console.info("[celebrations] Daily check:", result)
    } catch (error) {
      console.error("[celebrations] Daily check failed:", error)
    }
  })

  // Every 30 minutes from 02:00–10:00 UTC (7:30am–3:30pm IST) — wide enough
  // to catch shift starts anywhere in that range across verticals with
  // different working hours. Each employee's own 30-min post-shift-start
  // window (see nudge.ts) means this only ever nudges them once per shift,
  // not once per tick.
  cron.schedule("*/30 2-10 * * *", async () => {
    try {
      const result = await nudgeMissingCheckIns()
      console.info("[attendance] Missing check-in nudge sweep:", result)
    } catch (error) {
      console.error("[attendance] Missing check-in nudge sweep failed:", error)
    }
  })

  console.info("[schedulers] Registered: subscription reminders, celebrations, attendance nudges")
}
