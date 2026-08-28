"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api-client"
import { AssigneeMultiselect } from "@/features/projects/components/assignee-multiselect"
import type { AssigneeRef } from "@/features/projects/lib/types"

export function AssignEmployeesDialog({
  courseId,
  alreadyEnrolledIds,
  open,
  onOpenChange,
  onSaved,
}: {
  courseId: string
  alreadyEnrolledIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [employees, setEmployees] = useState<AssigneeRef[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setSelected([])
      apiFetch<{ employees: AssigneeRef[] }>("/api/projects/employees").then((r) => r.success && setEmployees(r.data.employees))
    }
  }, [open])

  const options = employees.filter((e) => !alreadyEnrolledIds.includes(e.id))

  async function handleSubmit() {
    if (selected.length === 0) return
    setIsSubmitting(true)
    try {
      const result = await apiFetch(`/api/learning/courses/${courseId}/enrollments`, { method: "POST", body: { employeeIds: selected } })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Employees assigned")
      onOpenChange(false)
      onSaved()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign employees</DialogTitle>
          <DialogDescription>They&apos;ll be notified and can start the course from &quot;My Learning&quot;.</DialogDescription>
        </DialogHeader>
        <AssigneeMultiselect options={options} value={selected} onChange={setSelected} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selected.length === 0}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
