"use client"

import { useEffect, useMemo, useState } from "react"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { apiFetch } from "@/lib/api-client"

type CalendarEntry = {
  id: string
  startDate: string
  endDate: string
  employee: { id: string; firstName: string; lastName: string }
  leaveType: { name: string; code: string }
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function LeaveCalendar() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    apiFetch<{ entries: CalendarEntry[] }>(
      `/api/leave/calendar?year=${cursor.getFullYear()}&month=${cursor.getMonth() + 1}`
    ).then((result) => {
      if (cancelled) return
      if (result.success) setEntries(result.data.entries)
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [cursor])

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor))
    const gridEnd = endOfWeek(endOfMonth(cursor))
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [cursor])

  function entriesForDay(day: Date) {
    // startDate/endDate are UTC-midnight-anchored calendar dates (@db.Date),
    // not real instants — comparing them as timestamps against a locally
    // constructed `day` breaks for single-day entries whenever the browser
    // isn't in UTC (start === end is a zero-width interval). Compare the
    // calendar-date strings instead.
    const dayStr = format(day, "yyyy-MM-dd")
    return entries.filter((e) => dayStr >= e.startDate.slice(0, 10) && dayStr <= e.endDate.slice(0, 10))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{format(cursor, "MMMM yyyy")}</CardTitle>
        <div className="flex gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => setCursor((c) => subMonths(c, 1))}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => setCursor((c) => addMonths(c, 1))}>
            <ChevronRight />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="grid grid-cols-7 gap-1 text-sm">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-1 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {days.map((day) => {
              const dayEntries = entriesForDay(day)
              const inMonth = isSameMonth(day, cursor)
              return (
                <div
                  key={day.toISOString()}
                  className={`flex min-h-16 flex-col gap-0.5 rounded-md border p-1 text-xs ${inMonth ? "" : "opacity-30"}`}
                >
                  <span className="text-center">{format(day, "d")}</span>
                  {dayEntries.slice(0, 2).map((e) => (
                    <Tooltip key={e.id}>
                      <TooltipTrigger asChild>
                        <span className="truncate rounded bg-violet-500/10 px-1 py-0.5 text-[10px] text-violet-700 dark:text-violet-400">
                          {e.employee.firstName}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {e.employee.firstName} {e.employee.lastName} — {e.leaveType.name}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {dayEntries.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">+{dayEntries.length - 2} more</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
