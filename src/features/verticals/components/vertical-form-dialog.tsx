"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { apiFetch } from "@/lib/api-client"
import { WEEKDAY_VALUES } from "@/features/settings/schemas"
import { verticalFormSchema, type VerticalFormInput } from "@/features/verticals/schemas"
import { AssigneeMultiselect } from "@/features/projects/components/assignee-multiselect"
import type { AssigneeRef } from "@/features/projects/lib/types"

const WEEKDAY_LABELS: Record<string, string> = {
  MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun",
}

export type VerticalEditTarget = {
  id: string
  name: string
  startTime: string
  endTime: string
  workingDays: string[]
  graceMinutes: number
  halfDayHours: number
  fullDayHours: number
  officeIpAllowlist: string | null
  managers: { id: string; firstName: string; lastName: string }[]
} | null

export function VerticalFormDialog({
  target,
  open,
  onOpenChange,
  onSaved,
}: {
  target: VerticalEditTarget
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [employees, setEmployees] = useState<AssigneeRef[]>([])
  const isEdit = !!target

  const form = useForm<VerticalFormInput>({
    resolver: zodResolver(verticalFormSchema),
    defaultValues: {
      name: "",
      startTime: "09:00",
      endTime: "18:00",
      workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
      graceMinutes: "10",
      halfDayHours: "4",
      fullDayHours: "8",
      managerIds: [],
      officeIpAllowlist: "",
    },
  })

  useEffect(() => {
    if (open && employees.length === 0) {
      apiFetch<{ employees: AssigneeRef[] }>("/api/projects/employees").then((result) => {
        if (result.success) setEmployees(result.data.employees)
      })
    }
  }, [open, employees.length])

  useEffect(() => {
    if (open) {
      form.reset({
        name: target?.name ?? "",
        startTime: target?.startTime ?? "09:00",
        endTime: target?.endTime ?? "18:00",
        workingDays: (target?.workingDays as VerticalFormInput["workingDays"]) ?? ["MON", "TUE", "WED", "THU", "FRI"],
        graceMinutes: target ? String(target.graceMinutes) : "10",
        halfDayHours: target ? String(target.halfDayHours) : "4",
        fullDayHours: target ? String(target.fullDayHours) : "8",
        managerIds: target?.managers.map((m) => m.id) ?? [],
        officeIpAllowlist: target?.officeIpAllowlist ?? "",
      })
    }
  }, [open, target, form])

  async function onSubmit(values: VerticalFormInput) {
    setIsSubmitting(true)
    try {
      const result = isEdit
        ? await apiFetch(`/api/settings/verticals/${target!.id}`, { method: "PATCH", body: values })
        : await apiFetch("/api/settings/verticals", { method: "POST", body: values })

      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(isEdit ? "Vertical updated" : "Vertical created")
      onOpenChange(false)
      onSaved()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit vertical" : "Add vertical"}</DialogTitle>
          <DialogDescription>A business unit or brand with its own working hours (e.g. Amarc, Athachi Group).</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Amarc" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormField
              control={form.control}
              name="managerIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vertical managers</FormLabel>
                  <FormControl>
                    <AssigneeMultiselect options={employees} value={field.value} onChange={field.onChange} />
                  </FormControl>
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
                    <FormLabel>Grace period (min)</FormLabel>
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
                    <FormLabel>Half-day hrs</FormLabel>
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
                    <FormLabel>Full-day hrs</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="officeIpAllowlist"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Office IP allowlist</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="203.0.113.10, 198.51.100.0/24"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Comma or newline-separated exact IPs and/or CIDR ranges. Employees in this vertical whose work
                    mode is Office can only check in from one of these — leave blank to not restrict check-in for
                    this vertical.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isEdit ? "Save changes" : "Add vertical"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
