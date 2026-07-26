"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, LabelList } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { EmptyChartState } from "@/features/dashboard/components/empty-chart-state"
import { getCategoricalColor } from "@/features/dashboard/lib/chart-colors"

const chartConfig = {
  count: { label: "Days" },
} satisfies ChartConfig

// Fixed status → slot so a status keeps its color regardless of which
// statuses appear in a given window or how large their counts are.
const STATUS_SLOT: Record<string, number> = {
  Present: 0,
  "Work From Home": 1,
  "Half Day": 2,
  Absent: 3,
  Leave: 4,
  Holiday: 5,
  "Week Off": 6,
}

export function AttendanceChart({ data }: { data: { status: string; count: number }[] }) {
  const hasData = data.some((d) => d.count > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Statistics</CardTitle>
        <CardDescription>Last 14 days, all employees</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart data={data} margin={{ left: 0, right: 12, top: 16 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={4}>
                <LabelList dataKey="count" position="top" className="fill-foreground" fontSize={11} />
                {data.map((entry) => (
                  <Cell key={entry.status} fill={getCategoricalColor(STATUS_SLOT[entry.status] ?? 7)} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyChartState message="No attendance recorded in the last 14 days" />
        )}
      </CardContent>
    </Card>
  )
}
