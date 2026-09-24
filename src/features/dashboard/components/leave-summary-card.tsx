import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyChartState } from "@/features/dashboard/components/empty-chart-state"
import { getCategoricalColor } from "@/features/dashboard/lib/chart-colors"

type LeaveRow = { leaveType: string; count: number }

export function LeaveSummaryCard({ data }: { data: LeaveRow[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const max = Math.max(1, ...data.map((d) => d.count))
  const hasData = total > 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Leave Summary</CardTitle>
          <CardDescription>Requests by type, all time</CardDescription>
        </div>
        <Badge variant="outline" className="shrink-0">All time</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasData ? (
          <>
            <div className="flex flex-col gap-3.5">
              {data.map((d, index) => (
                <div key={d.leaveType} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{d.leaveType}</span>
                    <strong className="tabular-nums">{d.count}</strong>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${(d.count / max) * 100}%`, backgroundColor: getCategoricalColor(index) }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-3 text-xs">
              <span className="text-muted-foreground">{total} requests total</span>
              <Link href="/reports" className="font-semibold text-primary hover:underline">
                View leave report →
              </Link>
            </div>
          </>
        ) : (
          <EmptyChartState message="No leave requests yet" />
        )}
      </CardContent>
    </Card>
  )
}
