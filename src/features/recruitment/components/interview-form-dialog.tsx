"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { apiFetch } from "@/lib/api-client"
import { AssigneeMultiselect } from "@/features/projects/components/assignee-multiselect"
import type { AssigneeRef } from "@/features/projects/lib/types"
import { interviewFormSchema, type InterviewFormInput } from "@/features/recruitment/schemas"

export type InterviewEditTarget = {
  id: string
  roundName: string
  scheduledAt: string
  durationMinutes: number | null
  location: string | null
  panelists: { employee: { id: string } }[]
} | null

export function InterviewFormDialog({
  candidateId,
  target,
  open,
  onOpenChange,
  onSaved,
}: {
  candidateId: string
  target: InterviewEditTarget
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [employees, setEmployees] = useState<AssigneeRef[]>([])
  const isEdit = !!target

  const form = useForm<InterviewFormInput>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: { roundName: "", scheduledAt: "", panelistIds: [] },
  })

  useEffect(() => {
    if (open && employees.length === 0) {
      apiFetch<{ employees: AssigneeRef[] }>("/api/projects/employees").then((r) => r.success && setEmployees(r.data.employees))
    }
  }, [open, employees.length])

  useEffect(() => {
    if (open) {
      form.reset({
        roundName: target?.roundName ?? "",
        scheduledAt: target?.scheduledAt ? target.scheduledAt.slice(0, 16) : "",
        durationMinutes: target?.durationMinutes != null ? String(target.durationMinutes) : undefined,
        location: target?.location ?? undefined,
        panelistIds: target?.panelists.map((p) => p.employee.id) ?? [],
      })
    }
  }, [open, target, form])

  async function onSubmit(values: InterviewFormInput) {
    setIsSubmitting(true)
    try {
      const result = isEdit
        ? await apiFetch(`/api/recruitment/interviews/${target!.id}`, { method: "PATCH", body: values })
        : await apiFetch(`/api/recruitment/candidates/${candidateId}/interviews`, { method: "POST", body: values })

      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(isEdit ? "Interview updated" : "Interview scheduled")
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
          <DialogTitle>{isEdit ? "Edit interview" : "Schedule interview"}</DialogTitle>
          <DialogDescription>Panelists are notified when assigned.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="roundName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Round</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Technical Round 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date &amp; time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input type="number" min={5} placeholder="60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location / link</FormLabel>
                  <FormControl>
                    <Input placeholder="Meeting room or video call link" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="panelistIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Panelists</FormLabel>
                  <FormControl>
                    <AssigneeMultiselect options={employees} value={field.value} onChange={field.onChange} />
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
                {isEdit ? "Save changes" : "Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
