"use client"

import { useEffect, useMemo, useState } from "react"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { apiFetch } from "@/lib/api-client"
import { ATTENDANCE_STATUS_DOT, ATTENDANCE_STATUS_LABELS } from "@/features/attendance/lib/status"
import { AttendanceStatusLegend } from "@/features/attendance/components/attendance-status-legend"

type AttendanceRecord = { date: string; status: string; workingMinutes: number }
type HolidayRecord = { date: string; name: string; type: string }
type Summary = Record<string, number>

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function AttendanceCalendar({ employeeId }: { employeeId?: string }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [holidays, setHolidays] = useState<HolidayRecord[]>([])
  const [summary, setSummary] = useState<Summary>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    const params = new URLSearchParams({
      year: String(cursor.getFullYear()),
      month: String(cursor.getMonth() + 1),
    })
    if (employeeId) params.set("employeeId", employeeId)

    apiFetch<{ records: AttendanceRecord[]; holidays: HolidayRecord[]; summary: Summary }>(
      `/api/attendance/monthly?${params}`
    ).then((result) => {
      if (cancelled) return
      if (result.success) {
        setRecords(result.data.records)
        setHolidays(result.data.holidays)
        setSummary(result.data.summary)
      }
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [cursor, employeeId])

  const days = useMemo(() => {
    const monthStart = startOfMonth(cursor)
    const monthEnd = endOfMonth(cursor)
    const gridStart = startOfWeek(monthStart)
    const gridEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [cursor])

  function recordFor(day: Date) {
    return records.find((r) => isSameDay(new Date(r.date), day))
  }
  function holidayFor(day: Date) {
    return holidays.find((h) => isSameDay(new Date(h.date), day))
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
        {!isLoading && Object.keys(summary).length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(summary).map(([status, count]) => (
              <span
                key={status}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
              >
                <span className={`size-1.5 rounded-full ${ATTENDANCE_STATUS_DOT[status] ?? "bg-muted-foreground"}`} />
                {ATTENDANCE_STATUS_LABELS[status] ?? status}: {count}
              </span>
            ))}
          </div>
        )}
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-1 text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {days.map((day) => {
              const record = recordFor(day)
              const holiday = holidayFor(day)
              const inMonth = isSameMonth(day, cursor)
              const isToday = isSameDay(day, new Date())

              return (
                <Tooltip key={day.toISOString()}>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md border text-xs ${
                        inMonth ? "" : "opacity-30"
                      } ${isToday ? "border-primary" : "border-transparent"}`}
                    >
                      <span>{format(day, "d")}</span>
                      {record && (
                        <span className={`size-1.5 rounded-full ${ATTENDANCE_STATUS_DOT[record.status] ?? "bg-muted-foreground"}`} />
                      )}
                      {!record && holiday && <span className="size-1.5 rounded-full bg-teal-500" />}
                    </div>
                  </TooltipTrigger>
                  {(record || holiday) && (
                    <TooltipContent>
                      {holiday && <p>{holiday.name}</p>}
                      {record && <p>{ATTENDANCE_STATUS_LABELS[record.status] ?? record.status}</p>}
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </div>
        )}
        <div className="mt-4">
          <AttendanceStatusLegend />
        </div>
      </CardContent>
    </Card>
  )
}
