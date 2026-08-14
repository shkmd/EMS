"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { apiFetch } from "@/lib/api-client"
import { subscriptionSchema, billingCycleValues, subscriptionStatusValues, type SubscriptionInput } from "@/features/subscriptions/schemas"

type EmployeeOption = { id: string; name: string }

export type SubscriptionEditTarget = {
  id: string
  name: string
  vendor: string | null
  category: string | null
  cost: number | null
  billingCycle: string
  startDate: string | null
  endDate: string
  notifyEmployeeId: string | null
  notes: string | null
  status: string
} | null

const BILLING_CYCLE_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
  ONE_TIME: "One-time",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  CANCELLED: "Cancelled",
}

const emptyValues: SubscriptionInput = {
  name: "",
  vendor: "",
  category: "",
  cost: "",
  billingCycle: "YEARLY",
  startDate: "",
  endDate: "",
  notifyEmployeeId: "",
  notes: "",
  status: "ACTIVE",
}

export function SubscriptionFormDialog({
  open,
  onOpenChange,
  target,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: SubscriptionEditTarget
  onSaved: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [employees, setEmployees] = useState<EmployeeOption[] | null>(null)
  const isEdit = !!target

  const form = useForm<SubscriptionInput>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      target
        ? {
            name: target.name,
            vendor: target.vendor ?? "",
            category: target.category ?? "",
            cost: target.cost != null ? String(target.cost) : "",
            billingCycle: target.billingCycle as SubscriptionInput["billingCycle"],
            startDate: target.startDate ? target.startDate.slice(0, 10) : "",
            endDate: target.endDate.slice(0, 10),
            notifyEmployeeId: target.notifyEmployeeId ?? "",
            notes: target.notes ?? "",
            status: target.status as SubscriptionInput["status"],
          }
        : emptyValues
    )
    if (!employees) {
      apiFetch<{ employees: EmployeeOption[] }>("/api/projects/employees").then((result) => {
        if (result.success) setEmployees(result.data.employees)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target])

  async function onSubmit(values: SubscriptionInput) {
    setIsSubmitting(true)
    try {
      const result = isEdit
        ? await apiFetch(`/api/subscriptions/${target!.id}`, { method: "PATCH", body: values })
        : await apiFetch("/api/subscriptions", { method: "POST", body: values })

      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(isEdit ? "Subscription updated" : "Subscription added")
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
          <DialogTitle>{isEdit ? "Edit subscription" : "Add subscription"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update subscription details."
              : "Track a company subscription and get reminded 7 days before it renews or expires."}
          </DialogDescription>
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
                    <Input placeholder="e.g. Google Workspace" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Software, Domain, Hosting" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingCycle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing cycle</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {billingCycleValues.map((c) => (
                          <SelectItem key={c} value={c}>
                            {BILLING_CYCLE_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Renewal / end date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="notifyEmployeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notify</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Defaults to Admin/HR" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subscriptionStatusValues.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
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
                {isEdit ? "Save changes" : "Add subscription"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
