"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, LabelList } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { EmptyChartState } from "@/features/dashboard/components/empty-chart-state"
import { getCategoricalColor } from "@/features/dashboard/lib/chart-colors"

const chartConfig = {
  count: { label: "Employees" },
} satisfies ChartConfig

export function DepartmentChart({ data }: { data: { department: string; count: number }[] }) {
  const hasData = data.some((d) => d.count > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Wise Employees</CardTitle>
        <CardDescription>Headcount by department</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart data={data} margin={{ left: 0, right: 12, top: 16 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="department"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={4}>
                <LabelList dataKey="count" position="top" className="fill-foreground" fontSize={11} />
                {data.map((entry, index) => (
                  <Cell key={entry.department} fill={getCategoricalColor(index)} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyChartState message="No departments yet" />
        )}
      </CardContent>
    </Card>
  )
}
