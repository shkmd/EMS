/** Minutes since midnight for an "HH:mm" string, or null if malformed. */
function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** Hours between two "HH:mm" times, or null if either is malformed or `toTime` isn't after `fromTime`. */
export function hoursBetween(fromTime: string, toTime: string): number | null {
  const from = toMinutes(fromTime)
  const to = toMinutes(toTime)
  if (from === null || to === null || to <= from) return null
  return (to - from) / 60
}

/** "14:00" -> "2:00 PM", for display. Returns the raw string if malformed. */
export function formatTime12h(time: string) {
  const minutes = toMinutes(time)
  if (minutes === null) return time
  const hour24 = Math.floor(minutes / 60)
  const minute = minutes % 60
  const period = hour24 >= 12 ? "PM" : "AM"
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`
}
