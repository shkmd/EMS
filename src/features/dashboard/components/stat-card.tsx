import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type StatCardProps = {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  accent?: "default" | "success" | "warning" | "destructive" | "info" | "violet"
  href?: string
}

const ACCENT_CLASSES: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  destructive: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  info: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
}

export function StatCard({ label, value, icon: Icon, hint, accent = "default", href }: StatCardProps) {
  const content = (
    <CardContent className="flex flex-col gap-3">
      <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", ACCENT_CLASSES[accent])}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="truncate text-xs text-muted-foreground/80">{hint}</p>}
      </div>
    </CardContent>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        <Card className="transition-colors hover:bg-accent/50">{content}</Card>
      </Link>
    )
  }

  return <Card>{content}</Card>
}
