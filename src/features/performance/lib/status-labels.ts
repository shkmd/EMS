export const GOAL_STATUS_BADGE: Record<string, string> = {
  NOT_STARTED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  COMPLETED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CANCELLED: "bg-red-500/10 text-red-700 dark:text-red-400",
}

export const REVIEW_STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  ACKNOWLEDGED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
}
