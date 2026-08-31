"use client"

import { useMemo } from "react"
import { Pie, PieChart, Cell } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { EmptyChartState } from "@/features/dashboard/components/empty-chart-state"
import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_CHART_COLOR } from "@/features/attendance/lib/status"

export function AttendanceStatusPieChart({ rows }: { rows: { status: string }[] }) {
  const data = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of rows) counts.set(r.status, (counts.get(r.status) ?? 0) + 1)
    return [...counts.entries()]
      .map(([status, count]) => ({ status, label: ATTENDANCE_STATUS_LABELS[status] ?? status, count }))
      .sort((a, b) => b.count - a.count)
  }, [rows])

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    for (const d of data) config[d.status] = { label: d.label, color: ATTENDANCE_STATUS_CHART_COLOR[d.status] ?? "#9ca3af" }
    return config
  }, [data])

  const hasData = data.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Breakdown</CardTitle>
        <CardDescription>Attendance status distribution for the current filter.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[240px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
              <Pie data={data} dataKey="count" nameKey="status" innerRadius={50} strokeWidth={2}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={ATTENDANCE_STATUS_CHART_COLOR[entry.status] ?? "#9ca3af"} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="status" />} />
            </PieChart>
          </ChartContainer>
        ) : (
          <EmptyChartState message="No records for this range" />
        )}
      </CardContent>
    </Card>
  )
}
