import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Users, UserCheck, CalendarClock, UserX, UserPlus } from "lucide-react"

import { cn } from "@/lib/utils"

type Tint = "indigo" | "emerald" | "amber" | "rose" | "violet"

const TINT_CLASSES: Record<Tint, { card: string; icon: string; positive: string }> = {
  indigo: {
    card: "bg-indigo-500/8 border-indigo-500/15 dark:bg-indigo-500/10",
    icon: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
    positive: "text-indigo-700 dark:text-indigo-400",
  },
  emerald: {
    card: "bg-emerald-500/8 border-emerald-500/15 dark:bg-emerald-500/10",
    icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    positive: "text-emerald-700 dark:text-emerald-400",
  },
  amber: {
    card: "bg-amber-500/8 border-amber-500/15 dark:bg-amber-500/10",
    icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    positive: "text-amber-700 dark:text-amber-400",
  },
  rose: {
    card: "bg-rose-500/8 border-rose-500/15 dark:bg-rose-500/10",
    icon: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    positive: "text-rose-700 dark:text-rose-400",
  },
  violet: {
    card: "bg-violet-500/8 border-violet-500/15 dark:bg-violet-500/10",
    icon: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    positive: "text-violet-700 dark:text-violet-400",
  },
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tint,
  href,
}: {
  label: string
  value: React.ReactNode
  hint: React.ReactNode
  icon: LucideIcon
  tint: Tint
  href: string
}) {
  const classes = TINT_CLASSES[tint]
  return (
    <Link
      href={href}
      className={cn("flex items-start gap-3 rounded-2xl border p-4 transition-colors hover:brightness-95", classes.card)}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground/80">{label}</p>
        <p className="mt-1 text-[28px] font-extrabold tracking-tight tabular-nums">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", classes.icon)}>
        <Icon className="size-5" />
      </div>
    </Link>
  )
}

export function KpiCards({
  employeeStats,
  attendanceToday,
  pendingLeaveRequests,
}: {
  employeeStats: { total: number; active: number; inactive: number; newThisMonth: number; departmentCount: number }
  attendanceToday: { present: number; totalActive: number }
  pendingLeaveRequests: number
}) {
  const presentPct = attendanceToday.totalActive > 0 ? ((attendanceToday.present / attendanceToday.totalActive) * 100).toFixed(1) : "0"
  const inactivePct = employeeStats.total > 0 ? ((employeeStats.inactive / employeeStats.total) * 100).toFixed(1) : "0"

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        label="Total Employees"
        value={employeeStats.total}
        hint={
          <>
            <span className={TINT_CLASSES.indigo.positive + " font-semibold"}>{employeeStats.active} active</span> ·{" "}
            {employeeStats.inactive} inactive
          </>
        }
        icon={Users}
        tint="indigo"
        href="/employees"
      />
      <KpiCard
        label="Present Today"
        value={
          <>
            {attendanceToday.present}
            <span className="text-base font-semibold text-muted-foreground"> / {attendanceToday.totalActive}</span>
          </>
        }
        hint={<><span className={TINT_CLASSES.emerald.positive + " font-semibold"}>{presentPct}%</span> of active staff</>}
        icon={UserCheck}
        tint="emerald"
        href="/attendance?tab=team"
      />
      <KpiCard
        label="Pending Leave"
        value={pendingLeaveRequests}
        hint={pendingLeaveRequests === 0 ? "Nothing awaiting approval" : "Awaiting your approval"}
        icon={CalendarClock}
        tint="amber"
        href="/leave?tab=approvals"
      />
      <KpiCard
        label="Inactive"
        value={employeeStats.inactive}
        hint={<><span className={TINT_CLASSES.rose.positive + " font-semibold"}>{inactivePct}%</span> of headcount</>}
        icon={UserX}
        tint="rose"
        href="/employees?status=INACTIVE"
      />
      <KpiCard
        label="New Joiners"
        value={employeeStats.newThisMonth}
        hint={`Across ${employeeStats.departmentCount} departments`}
        icon={UserPlus}
        tint="violet"
        href="/employees?sortBy=dateOfJoining&sortOrder=desc"
      />
    </div>
  )
}
