import { BarChart3 } from "lucide-react"

export function EmptyChartState({ message = "No data yet" }: { message?: string }) {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-muted-foreground">
      <BarChart3 className="size-8 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
