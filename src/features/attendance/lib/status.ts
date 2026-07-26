export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half Day",
  LEAVE: "Leave",
  WORK_FROM_HOME: "WFH",
  HOLIDAY: "Holiday",
  WEEK_OFF: "Week Off",
}

// Fixed status -> Tailwind classes, so a status keeps its color regardless
// of which statuses appear in a given view (see dataviz skill: color
// follows the entity, never sort rank). Deliberately distinct from the
// dashboard's chart palette — these are small calendar/badge dots, not a
// multi-series chart, so plain semantic Tailwind colors read better than
// forcing the categorical chart palette into a UI role it isn't for.
export const ATTENDANCE_STATUS_DOT: Record<string, string> = {
  PRESENT: "bg-emerald-500",
  WORK_FROM_HOME: "bg-blue-500",
  HALF_DAY: "bg-amber-500",
  ABSENT: "bg-red-500",
  LEAVE: "bg-violet-500",
  HOLIDAY: "bg-teal-500",
  WEEK_OFF: "bg-muted-foreground/40",
}

export const ATTENDANCE_STATUS_BADGE: Record<string, string> = {
  PRESENT: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  WORK_FROM_HOME: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  HALF_DAY: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  ABSENT: "bg-red-500/10 text-red-700 dark:text-red-400",
  LEAVE: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  HOLIDAY: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  WEEK_OFF: "bg-muted text-muted-foreground",
}
