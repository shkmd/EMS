"use client"

import { Area, AreaChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { EmptyChartState } from "@/features/dashboard/components/empty-chart-state"

const chartConfig = {
  count: { label: "Employees", color: "var(--chart-1)" },
} satisfies ChartConfig

export function EmployeeGrowthChart({ data }: { data: { month: string; count: number }[] }) {
  const hasData = data.some((d) => d.count > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Growth</CardTitle>
        <CardDescription>Total headcount over the last {data.length} months</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <AreaChart data={data} margin={{ left: 0, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis hide allowDecimals={false} domain={[0, (max: number) => Math.max(max + 1, 1)]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <defs>
                <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                dataKey="count"
                type="monotone"
                fill="url(#fillCount)"
                stroke="var(--color-count)"
                strokeWidth={2}
              >
                <LabelList dataKey="count" position="top" className="fill-foreground" fontSize={11} />
              </Area>
            </AreaChart>
          </ChartContainer>
        ) : (
          <EmptyChartState message="No employees yet" />
        )}
      </CardContent>
    </Card>
  )
}
