"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
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
import { leaveTypeFormSchema, type LeaveTypeFormInput } from "@/features/settings/schemas"

export type LeaveTypeEditTarget = {
  id: string
  name: string
  code: string
  defaultDaysPerYear: number
  isPaid: boolean
  carryForward: boolean
  maxCarryForwardDays: number | null
} | null

export function LeaveTypeFormDialog({
  target,
  open,
  onOpenChange,
  onSaved,
}: {
  target: LeaveTypeEditTarget
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!target

  const form = useForm<LeaveTypeFormInput>({
    resolver: zodResolver(leaveTypeFormSchema),
    defaultValues: { name: "", code: "", defaultDaysPerYear: "0", isPaid: true, carryForward: false, maxCarryForwardDays: "" },
  })

  const carryForward = form.watch("carryForward")

  useEffect(() => {
    if (open) {
      form.reset({
        name: target?.name ?? "",
        code: target?.code ?? "",
        defaultDaysPerYear: target ? String(target.defaultDaysPerYear) : "0",
        isPaid: target?.isPaid ?? true,
        carryForward: target?.carryForward ?? false,
        maxCarryForwardDays: target?.maxCarryForwardDays != null ? String(target.maxCarryForwardDays) : "",
      })
    }
  }, [open, target, form])

  async function onSubmit(values: LeaveTypeFormInput) {
    setIsSubmitting(true)
    try {
      const result = isEdit
        ? await apiFetch(`/api/settings/leave-types/${target!.id}`, { method: "PATCH", body: values })
        : await apiFetch("/api/settings/leave-types", { method: "POST", body: values })

      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(isEdit ? "Leave type updated" : "Leave type created")
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
          <DialogTitle>{isEdit ? "Edit leave type" : "Add leave type"}</DialogTitle>
          <DialogDescription>Defines the yearly allocation and rules new leave balances are seeded with.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Casual Leave" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. CL" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="defaultDaysPerYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default days per year</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isPaid"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <FormLabel>Paid leave</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="carryForward"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <FormLabel>Allow carry-forward</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            {carryForward && (
              <FormField
                control={form.control}
                name="maxCarryForwardDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max carry-forward days</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isEdit ? "Save changes" : "Add leave type"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
