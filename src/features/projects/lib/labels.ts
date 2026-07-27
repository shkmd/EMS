export const TASK_STATUS_LABEL: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
}

export const TASK_STATUS_BADGE: Record<string, string> = {
  TODO: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  IN_REVIEW: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  DONE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
}

export const TASK_STATUS_ORDER = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const

export const TASK_PRIORITY_LABEL: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
}

export const TASK_PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  HIGH: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  URGENT: "bg-red-500/10 text-red-700 dark:text-red-400",
}
