import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { UserPlus, CalendarDays, Clock, Wallet, Receipt, FolderKanban } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type QuickLink = { label: string; href: string; icon: LucideIcon; tint: string }

const LINKS: QuickLink[] = [
  { label: "Add Employee", href: "/employees/new", icon: UserPlus, tint: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
  { label: "Apply Leave", href: "/leave", icon: CalendarDays, tint: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { label: "Attendance", href: "/attendance", icon: Clock, tint: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { label: "Payslip", href: "/payroll", icon: Wallet, tint: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  { label: "Expenses", href: "/expenses", icon: Receipt, tint: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  { label: "Projects", href: "/projects", icon: FolderKanban, tint: "bg-primary-soft text-primary-soft-foreground" },
]

export function QuickAccessCard({ canAddEmployee }: { canAddEmployee: boolean }) {
  const links = LINKS.filter((l) => l.href !== "/employees/new" || canAddEmployee)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Access</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex flex-col items-center gap-2 rounded-xl py-2 text-center text-xs font-semibold text-foreground/80 transition-colors hover:bg-muted/60"
            >
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${l.tint}`}>
                <l.icon className="size-5" />
              </span>
              {l.label}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
