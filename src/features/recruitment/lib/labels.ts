export const JOB_OPENING_STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  ON_HOLD: "On Hold",
  CLOSED: "Closed",
  FILLED: "Filled",
}

export const JOB_OPENING_STATUS_BADGE: Record<string, string> = {
  OPEN: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  ON_HOLD: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  CLOSED: "bg-muted text-muted-foreground",
  FILLED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
}

export const CANDIDATE_STAGE_LABEL: Record<string, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
}

export const CANDIDATE_STAGE_BADGE: Record<string, string> = {
  APPLIED: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
  SCREENING: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  INTERVIEW: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  OFFER: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  HIRED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400",
  WITHDRAWN: "bg-muted text-muted-foreground",
}

/** Stages a candidate can be moved to directly from the pipeline dropdown —
 * HIRED is excluded since it goes through the dedicated hire/convert flow. */
export const CANDIDATE_STAGE_OPTIONS = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"] as const

export const INTERVIEW_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
}

export const INTERVIEW_STATUS_BADGE: Record<string, string> = {
  SCHEDULED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  COMPLETED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CANCELLED: "bg-red-500/10 text-red-700 dark:text-red-400",
  RESCHEDULED: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
}

export const RECOMMENDATION_LABEL: Record<string, string> = {
  STRONG_YES: "Strong Yes",
  YES: "Yes",
  NO: "No",
  STRONG_NO: "Strong No",
}

export const RECOMMENDATION_BADGE: Record<string, string> = {
  STRONG_YES: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  YES: "bg-lime-500/10 text-lime-700 dark:text-lime-400",
  NO: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  STRONG_NO: "bg-red-500/10 text-red-700 dark:text-red-400",
}

export const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERN: "Intern",
}
