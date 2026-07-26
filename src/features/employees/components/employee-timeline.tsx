import { format } from "date-fns"
import { CalendarClock, ArrowRightLeft, Award, RefreshCw, History } from "lucide-react"

export type EmployeeTimelineItem = {
  id: string
  type: string
  title: string
  description: string | null
  eventDate: Date | string
}

const TYPE_ICON: Record<string, typeof CalendarClock> = {
  JOINED: Award,
  STATUS_CHANGE: RefreshCw,
  TRANSFER: ArrowRightLeft,
}

export function EmployeeTimeline({ events }: { events: EmployeeTimelineItem[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
        <History className="size-8 opacity-50" />
        <p className="text-sm">No timeline events yet</p>
      </div>
    )
  }

  return (
    <ol className="flex flex-col gap-4">
      {events.map((event) => {
        const Icon = TYPE_ICON[event.type] ?? CalendarClock
        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{event.title}</p>
              {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
              <p className="text-xs text-muted-foreground">{format(new Date(event.eventDate), "dd MMM yyyy")}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
