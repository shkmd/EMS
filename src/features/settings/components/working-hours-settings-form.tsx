"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { apiFetch } from "@/lib/api-client"
import { WEEKDAY_VALUES, workingHoursSettingsSchema, type WorkingHoursSettingsInput } from "@/features/settings/schemas"

const WEEKDAY_LABELS: Record<string, string> = {
  MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun",
}

type SettingsResponse = {
  startTime: string
  endTime: string
  workingDays: string[]
  graceMinutes: number
  halfDayHours: number
  fullDayHours: number
}

export function WorkingHoursSettingsForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<WorkingHoursSettingsInput>({
    resolver: zodResolver(workingHoursSettingsSchema),
    defaultValues: {
      startTime: "09:00",
      endTime: "18:00",
      workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
      graceMinutes: "10",
      halfDayHours: "4",
      fullDayHours: "8",
    },
  })

  useEffect(() => {
    apiFetch<{ settings: SettingsResponse }>("/api/settings/working-hours").then((result) => {
      if (result.success) {
        const s = result.data.settings
        form.reset({
          startTime: s.startTime,
          endTime: s.endTime,
          workingDays: s.workingDays as WorkingHoursSettingsInput["workingDays"],
          graceMinutes: String(s.graceMinutes),
          halfDayHours: String(s.halfDayHours),
          fullDayHours: String(s.fullDayHours),
        })
      }
      setIsLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: WorkingHoursSettingsInput) {
    setIsSubmitting(true)
    try {
      const result = await apiFetch("/api/settings/working-hours", { method: "PUT", body: values })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Working hours settings updated")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default Working Hours</CardTitle>
        <CardDescription>
          Used for employees not assigned to a vertical below. Drives attendance status (half-day) and leave
          working-day calculations.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="workingDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Working days</FormLabel>
                  <div className="flex flex-wrap gap-3">
                    {WEEKDAY_VALUES.map((day) => (
                      <label key={day} className="flex items-center gap-1.5 text-sm">
                        <Checkbox
                          checked={field.value.includes(day)}
                          onCheckedChange={(checked) => {
                            field.onChange(checked ? [...field.value, day] : field.value.filter((d) => d !== day))
                          }}
                        />
                        {WEEKDAY_LABELS[day]}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="graceMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grace period (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="halfDayHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Half-day hours</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fullDayHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full-day hours</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}
