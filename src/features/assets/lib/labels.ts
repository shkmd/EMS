export const ASSET_CATEGORY_LABELS: Record<string, string> = {
  LAPTOP: "Laptop",
  MONITOR: "Monitor",
  MOBILE: "Mobile",
  ID_CARD: "ID Card",
  SIM: "SIM",
  VEHICLE: "Vehicle",
  OTHER: "Other",
}

export const ASSET_STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  ASSIGNED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  IN_REPAIR: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  RETIRED: "bg-muted text-muted-foreground",
}

export const ASSIGNMENT_STATUS_BADGE: Record<string, string> = {
  ASSIGNED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  RETURNED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  LOST: "bg-red-500/10 text-red-700 dark:text-red-400",
  DAMAGED: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
}
