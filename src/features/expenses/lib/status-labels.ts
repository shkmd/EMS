import type { ExpenseClaimStatus, ExpenseCategory } from "@prisma/client"

export const EXPENSE_STATUS_LABELS: Record<ExpenseClaimStatus, string> = {
  PENDING: "Pending",
  MANAGER_APPROVED: "Manager Approved",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REIMBURSED: "Reimbursed",
  CANCELLED: "Cancelled",
}

export const EXPENSE_STATUS_BADGE_CLASSES: Record<ExpenseClaimStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  MANAGER_APPROVED: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-400",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  REIMBURSED: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-400",
  CANCELLED: "bg-muted text-muted-foreground",
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  TRAVEL: "Travel",
  FOOD: "Food",
  ACCOMMODATION: "Accommodation",
  OFFICE_SUPPLIES: "Office Supplies",
  COMMUNICATION: "Communication",
  TRAINING: "Training",
  OTHER: "Other",
}
