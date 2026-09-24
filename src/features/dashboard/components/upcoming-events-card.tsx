import { Cake, PartyPopper, RefreshCw } from "lucide-react"
import { differenceInCalendarDays, format } from "date-fns"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Birthday = { id: string; firstName: string; lastName: string; day: number; profilePhotoUrl: string | null }
type Anniversary = Birthday & { years: number }
type Renewal = { id: string; name: string; endDate: Date }

type Event = {
  key: string
  tint: "violet" | "rose" | "muted" | "emerald"
  icon: React.ReactNode
  title: string
  subtitle: string
  badge: string
  sortKey: number
}

const TINT_CLASSES: Record<Event["tint"], { row: string; chip: string; badge: string }> = {
  violet: {
    row: "bg-violet-500/8 dark:bg-violet-500/10",
    chip: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    badge: "text-violet-600 dark:text-violet-400",
  },
  rose: {
    row: "bg-rose-500/8 dark:bg-rose-500/10",
    chip: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    badge: "text-rose-600 dark:text-rose-400",
  },
  muted: {
    row: "bg-muted/50",
    chip: "bg-muted text-muted-foreground",
    badge: "text-muted-foreground",
  },
  emerald: {
    row: "bg-emerald-500/8 dark:bg-emerald-500/10",
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    badge: "text-emerald-600 dark:text-emerald-400",
  },
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

export function UpcomingEventsCard({
  birthdays,
  anniversaries,
  renewals = [],
}: {
  birthdays: Birthday[]
  anniversaries: Anniversary[]
  renewals?: Renewal[]
}) {
  const today = new Date().getDate()
  const monthLabel = format(new Date(), "MMM")

  const events: Event[] = []

  for (const b of birthdays) {
    const delta = b.day - today
    events.push({
      key: `bday-${b.id}`,
      tint: delta < 0 ? "muted" : "violet",
      icon: <span className="text-xs font-bold">{initials(b.firstName, b.lastName)}</span>,
      title: delta < 0 ? "Birthday · Passed" : delta === 0 ? "Birthday · Today" : delta === 1 ? "Birthday · Tomorrow" : "Birthday · Upcoming",
      subtitle: `${b.firstName} ${b.lastName}`,
      badge: `${monthLabel} ${b.day}`,
      sortKey: delta < 0 ? 1000 - delta : delta,
    })
  }

  for (const a of anniversaries) {
    const delta = a.day - today
    events.push({
      key: `anniv-${a.id}`,
      tint: "emerald",
      icon: <PartyPopper className="size-4.5" />,
      title: `Work Anniversary · ${a.years} yr${a.years === 1 ? "" : "s"}`,
      subtitle: `${a.firstName} ${a.lastName}`,
      badge: `${monthLabel} ${a.day}`,
      sortKey: delta < 0 ? 1000 - delta : delta,
    })
  }

  for (const r of renewals) {
    const days = differenceInCalendarDays(r.endDate, new Date())
    events.push({
      key: `renewal-${r.id}`,
      tint: "rose",
      icon: <RefreshCw className="size-4.5" />,
      title: "Subscription Renewal",
      subtitle: r.name,
      badge: days <= 0 ? "Today" : `in ${days}d`,
      sortKey: Math.max(0, days),
    })
  }

  events.sort((a, b) => a.sortKey - b.sortKey)
  const visible = events.slice(0, 6)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Events</CardTitle>
        <CardDescription>Birthdays, anniversaries and renewals</CardDescription>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <Cake className="size-8 opacity-50" />
            <p className="text-sm">Nothing coming up this month</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((e) => {
              const classes = TINT_CLASSES[e.tint]
              return (
                <li key={e.key} className={cn("flex items-center gap-3 rounded-xl p-2.5", classes.row)}>
                  <span className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-full", classes.chip)}>
                    {e.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.subtitle}</p>
                  </div>
                  <span className={cn("shrink-0 text-xs font-semibold", classes.badge)}>{e.badge}</span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
