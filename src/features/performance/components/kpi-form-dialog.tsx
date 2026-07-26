"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { kpiFormSchema, type KpiFormInput } from "@/features/performance/schemas"

export type KpiEditTarget = {
  id: string
  name: string
  description: string | null
  targetValue: string
  achievedValue: string
  unit: string | null
  period: string
} | null

export function KpiFormDialog({
  employeeId,
  target,
  open,
  onOpenChange,
  onSaved,
}: {
  employeeId: string
  target: KpiEditTarget
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!target

  const form = useForm<KpiFormInput>({
    resolver: zodResolver(kpiFormSchema),
    defaultValues: { employeeId, name: "", description: "", targetValue: "0", achievedValue: "0", unit: "", period: "" },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        employeeId,
        name: target?.name ?? "",
        description: target?.description ?? "",
        targetValue: target?.targetValue ?? "0",
        achievedValue: target?.achievedValue ?? "0",
        unit: target?.unit ?? "",
        period: target?.period ?? "",
      })
    }
  }, [open, target, employeeId, form])

  async function onSubmit(values: KpiFormInput) {
    setIsSubmitting(true)
    try {
      const result = isEdit
        ? await apiFetch(`/api/performance/kpis/${target!.id}`, { method: "PATCH", body: values })
        : await apiFetch("/api/performance/kpis", { method: "POST", body: values })

      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(isEdit ? "KPI updated" : "KPI created")
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
          <DialogTitle>{isEdit ? "Edit KPI" : "Add KPI"}</DialogTitle>
          <DialogDescription>A measurable target for a specific period.</DialogDescription>
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="achievedValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Achieved</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. %, $, units" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 2026-Q3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isEdit ? "Save changes" : "Add KPI"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
