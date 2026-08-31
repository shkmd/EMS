export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half Day",
  LEAVE: "Leave",
  WORK_FROM_HOME: "WFH",
  HOLIDAY: "Holiday",
  WEEK_OFF: "Week Off",
  OUTDOOR_DUTY: "Outdoor Duty",
  COMPENSATORY_OFF: "Compensatory Off",
  PERMISSION: "Permission",
  WORK_ON_HOLIDAY: "Work On Holiday",
  CL: "Casual Leave",
  SL: "Sick Leave",
  EL: "Earned Leave",
  LOP: "Loss of Pay",
}

// Short codes for compact display (calendar cells, legend) — mirrors the
// abbreviations HR already uses on their own attendance sheets.
export const ATTENDANCE_STATUS_CODE: Record<string, string> = {
  PRESENT: "P",
  ABSENT: "A",
  HALF_DAY: "HD",
  LEAVE: "L",
  WORK_FROM_HOME: "WFH",
  HOLIDAY: "H",
  WEEK_OFF: "WO",
  OUTDOOR_DUTY: "OD",
  COMPENSATORY_OFF: "CO",
  PERMISSION: "PR",
  WORK_ON_HOLIDAY: "WOH",
  CL: "CL",
  SL: "SL",
  EL: "EL",
  LOP: "LOP",
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
  OUTDOOR_DUTY: "bg-cyan-500",
  COMPENSATORY_OFF: "bg-orange-500",
  PERMISSION: "bg-pink-500",
  WORK_ON_HOLIDAY: "bg-indigo-500",
  CL: "bg-fuchsia-500",
  SL: "bg-rose-500",
  EL: "bg-lime-500",
  LOP: "bg-stone-500",
}

// Same palette as ATTENDANCE_STATUS_DOT/BADGE above, as literal hex values —
// SVG chart fills need real color strings, not Tailwind classes.
export const ATTENDANCE_STATUS_CHART_COLOR: Record<string, string> = {
  PRESENT: "#10b981",
  WORK_FROM_HOME: "#3b82f6",
  HALF_DAY: "#f59e0b",
  ABSENT: "#ef4444",
  LEAVE: "#8b5cf6",
  HOLIDAY: "#14b8a6",
  WEEK_OFF: "#9ca3af",
  OUTDOOR_DUTY: "#06b6d4",
  COMPENSATORY_OFF: "#f97316",
  PERMISSION: "#ec4899",
  WORK_ON_HOLIDAY: "#6366f1",
  CL: "#d946ef",
  SL: "#f43f5e",
  EL: "#84cc16",
  LOP: "#78716c",
}

export const ATTENDANCE_STATUS_BADGE: Record<string, string> = {
  PRESENT: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  WORK_FROM_HOME: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  HALF_DAY: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  ABSENT: "bg-red-500/10 text-red-700 dark:text-red-400",
  LEAVE: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  HOLIDAY: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  WEEK_OFF: "bg-muted text-muted-foreground",
  OUTDOOR_DUTY: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  COMPENSATORY_OFF: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  PERMISSION: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  WORK_ON_HOLIDAY: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  CL: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400",
  SL: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  EL: "bg-lime-500/10 text-lime-700 dark:text-lime-400",
  LOP: "bg-stone-500/10 text-stone-700 dark:text-stone-400",
}
