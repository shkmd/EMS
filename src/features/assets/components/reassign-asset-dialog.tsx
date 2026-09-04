"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, UserCog } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { reassignAssetSchema, type ReassignAssetInput } from "@/features/assets/schemas"

type Employee = { id: string; firstName: string; lastName: string; employeeCode: string }

export function ReassignAssetDialog({
  assignmentId,
  currentEmployeeName,
  open,
  onOpenChange,
  onSaved,
}: {
  assignmentId: string | null
  currentEmployeeName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])

  const form = useForm<ReassignAssetInput>({
    resolver: zodResolver(reassignAssetSchema),
    defaultValues: { employeeId: "", issuedDate: "", condition: "", remarks: "" },
  })

  useEffect(() => {
    if (open && assignmentId) {
      form.reset({ employeeId: "", issuedDate: new Date().toISOString().slice(0, 10), condition: "", remarks: "" })
      apiFetch<{ employees: Employee[] }>("/api/assets/employees").then((result) => {
        if (result.success) setEmployees(result.data.employees)
      })
    }
  }, [open, assignmentId, form])

  async function onSubmit(values: ReassignAssetInput) {
    if (!assignmentId) return
    setIsSubmitting(true)
    try {
      const result = await apiFetch(`/api/assets/assignments/${assignmentId}/reassign`, { method: "POST", body: values })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Asset reassigned")
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
          <DialogTitle>Reassign asset</DialogTitle>
          <DialogDescription>
            {currentEmployeeName ? `Currently assigned to ${currentEmployeeName}. ` : ""}
            Pick who it should actually go to.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName} ({e.employeeCode})
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
              name="issuedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. New, Good, Fair" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
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
                {isSubmitting ? <Loader2 className="animate-spin" /> : <UserCog />}
                Reassign
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
