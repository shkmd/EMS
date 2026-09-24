"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Pie, PieChart, Cell } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { EmptyChartState } from "@/features/dashboard/components/empty-chart-state"
import { ATTENDANCE_STATUS_CHART_COLOR } from "@/features/attendance/lib/status"

type StatRow = { status: string; statusCode: string; count: number }

export function AttendanceDonutChart({ data, daysBack = 14 }: { data: StatRow[]; daysBack?: number }) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data])
  const hasData = total > 0

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    for (const d of data) config[d.status] = { label: d.status, color: ATTENDANCE_STATUS_CHART_COLOR[d.statusCode] ?? "#9ca3af" }
    return config
  }, [data])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Attendance Overview</CardTitle>
          <CardDescription>Records by status</CardDescription>
        </div>
        <Badge variant="outline" className="shrink-0">Last {daysBack} days</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasData ? (
          <>
            <div className="flex items-center gap-4">
              <div className="relative aspect-square h-[160px] shrink-0">
                <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[160px]">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
                    <Pie data={data} dataKey="count" nameKey="status" innerRadius={52} outerRadius={72} strokeWidth={2}>
                      {data.map((entry) => (
                        <Cell key={entry.statusCode} fill={ATTENDANCE_STATUS_CHART_COLOR[entry.statusCode] ?? "#9ca3af"} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tabular-nums">{total}</span>
                  <span className="text-xs text-muted-foreground">Records</span>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2.5 text-sm">
                {data.map((d) => (
                  <div key={d.statusCode} className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: ATTENDANCE_STATUS_CHART_COLOR[d.statusCode] ?? "#9ca3af" }}
                    />
                    <span className="flex-1 truncate">{d.status}</span>
                    <strong className="tabular-nums">{d.count}</strong>
                    <span className="w-12 text-right text-xs text-muted-foreground">
                      {((d.count / total) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t pt-3 text-center">
              <Link href="/reports" className="text-xs font-semibold text-primary hover:underline">
                View attendance report →
              </Link>
            </div>
          </>
        ) : (
          <EmptyChartState message="No attendance recorded in the last 14 days" />
        )}
      </CardContent>
    </Card>
  )
}
