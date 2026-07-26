"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, LabelList } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { EmptyChartState } from "@/features/dashboard/components/empty-chart-state"
import { getCategoricalColor } from "@/features/dashboard/lib/chart-colors"

const chartConfig = {
  count: { label: "Requests" },
} satisfies ChartConfig

// Fixed leave-type → slot (by the standard four types seeded in Module 1);
// unrecognized/custom types fall through to later slots.
const LEAVE_TYPE_SLOT: Record<string, number> = {
  "Casual Leave": 0,
  "Sick Leave": 1,
  "Earned Leave": 2,
  "Loss of Pay": 3,
}

export function LeaveChart({ data }: { data: { leaveType: string; count: number }[] }) {
  const hasData = data.some((d) => d.count > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Statistics</CardTitle>
        <CardDescription>Leave requests by type (all time)</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart data={data} margin={{ left: 0, right: 12, top: 16 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="leaveType" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={4}>
                <LabelList dataKey="count" position="top" className="fill-foreground" fontSize={11} />
                {data.map((entry, index) => (
                  <Cell
                    key={entry.leaveType}
                    fill={getCategoricalColor(LEAVE_TYPE_SLOT[entry.leaveType] ?? 4 + index)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyChartState message="No leave requests yet" />
        )}
      </CardContent>
    </Card>
  )
}
