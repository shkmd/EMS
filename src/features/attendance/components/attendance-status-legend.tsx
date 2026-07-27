import { ATTENDANCE_STATUS_CODE, ATTENDANCE_STATUS_DOT, ATTENDANCE_STATUS_LABELS } from "@/features/attendance/lib/status"

const LEGEND_ORDER = [
  "PRESENT",
  "OUTDOOR_DUTY",
  "WORK_FROM_HOME",
  "WORK_ON_HOLIDAY",
  "COMPENSATORY_OFF",
  "HALF_DAY",
  "PERMISSION",
  "LEAVE",
  "ABSENT",
  "HOLIDAY",
  "WEEK_OFF",
]

export function AttendanceStatusLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t pt-3 text-xs text-muted-foreground">
      {LEGEND_ORDER.map((status) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${ATTENDANCE_STATUS_DOT[status]}`} />
          <span className="font-medium text-foreground">{ATTENDANCE_STATUS_CODE[status]}</span>
          <span>{ATTENDANCE_STATUS_LABELS[status]}</span>
        </span>
      ))}
    </div>
  )
}
