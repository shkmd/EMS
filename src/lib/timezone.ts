/**
 * Converts a wall-clock date+time to the UTC instant it represents in an
 * arbitrary IANA timezone (e.g. CompanySettings.timezone).
 *
 * `new Date(`${date}T${time}`)` implicitly parses in the *server's* local
 * timezone, which for this app's Docker containers is always UTC — not
 * necessarily the company's actual timezone. Using that constructor for
 * manually-entered clock times (attendance check-in/out, etc.) silently
 * shifts them by the offset between the server and the company, which is
 * exactly the bug this replaces (e.g. a company on Asia/Kolkata entering
 * "09:00" got it stored as 09:00 UTC = 14:30 IST).
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number)
  const [hour, minute] = timeStr.split(":").map(Number)

  // First guess: treat the wall-clock digits as if they were already UTC.
  const guessUtcMs = Date.UTC(year!, month! - 1, day!, hour!, minute!)

  // Find the timezone's actual offset at that moment (DST-aware, via the
  // Intl timezone database) by seeing what that guessed instant reads as
  // when formatted in the target zone, then correct for the difference.
  const offsetMs = zonedWallClockAsUtcMs(new Date(guessUtcMs), timeZone) - guessUtcMs
  return new Date(guessUtcMs - offsetMs)
}

function zonedWallClockAsUtcMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value
      return acc
    }, {})

  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  )
}
