"use client"

import { useEffect } from "react"
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
import { leaveRequestUpdateSchema, leaveRequestStatusValues, type LeaveRequestUpdateInput } from "@/features/leave/schemas"
import { LEAVE_STATUS_LABELS } from "@/features/leave/lib/status-labels"

type LeaveType = { id: string; name: string }

export function EditLeaveRequestDialog({
  requestId,
  leaveTypes,
  defaultValues,
  open,
  onOpenChange,
  onSaved,
}: {
  requestId: string | null
  leaveTypes: LeaveType[]
  defaultValues?: LeaveRequestUpdateInput
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const form = useForm<LeaveRequestUpdateInput>({
    resolver: zodResolver(leaveRequestUpdateSchema),
    defaultValues: defaultValues ?? {
      leaveTypeId: "",
      startDate: "",
      endDate: "",
      duration: "FULL_DAY",
      reason: "",
      status: "PENDING",
    },
  })

  useEffect(() => {
    if (open && defaultValues) form.reset(defaultValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function onSubmit(values: LeaveRequestUpdateInput) {
    if (!requestId) return
    const result = await apiFetch(`/api/leave/${requestId}`, { method: "PATCH", body: values })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    toast.success("Leave request updated")
    onOpenChange(false)
    onSaved()
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct leave request</DialogTitle>
          <DialogDescription>
            Directly edits this request — including status — and adjusts the employee&apos;s leave balance to match.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="leaveTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leaveTypes.map((lt) => (
                        <SelectItem key={lt.id} value={lt.id}>
                          {lt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
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
                    <FormLabel>End date</FormLabel>
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
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FULL_DAY">Full day(s)</SelectItem>
                        <SelectItem value="FIRST_HALF">First half (single day)</SelectItem>
                        <SelectItem value="SECOND_HALF">Second half (single day)</SelectItem>
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
                        {leaveRequestStatusValues.map((s) => (
                          <SelectItem key={s} value={s}>
                            {LEAVE_STATUS_LABELS[s]}
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
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
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
