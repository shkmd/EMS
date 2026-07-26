"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { apiFetch } from "@/lib/api-client"

type DeleteEmployeeDialogProps = {
  employee: { id: string; firstName: string; lastName: string } | null
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteEmployeeDialog({ employee, onOpenChange, onDeleted }: DeleteEmployeeDialogProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleConfirm() {
    if (!employee) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/employees/${employee.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Employee deleted")
      onOpenChange(false)
      onDeleted?.()
      router.refresh()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={!!employee} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete employee?</AlertDialogTitle>
          <AlertDialogDescription>
            {employee && (
              <>
                This will remove <strong>{employee.firstName} {employee.lastName}</strong> from active
                employee lists. Their attendance, leave, and payroll history are preserved.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isDeleting} className="bg-destructive text-white hover:bg-destructive/90">
            {isDeleting && <Loader2 className="animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
