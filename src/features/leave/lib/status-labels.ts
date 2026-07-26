export const LEAVE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  MANAGER_APPROVED: "Manager Approved",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
}

export const LEAVE_STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  MANAGER_APPROVED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  APPROVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400",
  CANCELLED: "bg-muted text-muted-foreground",
}
