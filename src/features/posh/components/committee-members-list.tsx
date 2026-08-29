"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Plus, Star, Trash2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api-client"
import { initials } from "@/features/messaging/lib/initials"
import type { AssigneeRef } from "@/features/projects/lib/types"

type CommitteeMemberRow = {
  id: string
  isPresidingOfficer: boolean
  employee: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null }
}

export function CommitteeMembersList({ initialMembers, employees }: { initialMembers: CommitteeMemberRow[]; employees: AssigneeRef[] }) {
  const [members, setMembers] = useState(initialMembers)
  const [formOpen, setFormOpen] = useState(false)

  function reload() {
    apiFetch<{ members: CommitteeMemberRow[] }>("/api/posh/committee").then((r) => r.success && setMembers(r.data.members))
  }

  async function handleRemove(id: string) {
    const result = await apiFetch(`/api/posh/committee/${id}`, { method: "DELETE" })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    reload()
  }

  const memberEmployeeIds = members.map((m) => m.employee.id)
  const availableEmployees = employees.filter((e) => !memberEmployeeIds.includes(e.id))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Internal Committee</CardTitle>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus /> Add member
        </Button>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No committee members added yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="size-8">
                    {m.employee.profilePhotoUrl && <AvatarImage src={`/api/employees/${m.employee.id}/photo`} />}
                    <AvatarFallback className="text-xs">{initials(`${m.employee.firstName} ${m.employee.lastName}`)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {m.employee.firstName} {m.employee.lastName}
                  </span>
                  {m.isPresidingOfficer && (
                    <Badge variant="outline" className="gap-1">
                      <Star className="size-3" /> Presiding Officer
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => handleRemove(m.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AddCommitteeMemberDialog employees={availableEmployees} open={formOpen} onOpenChange={setFormOpen} onSaved={reload} />
    </Card>
  )
}

function AddCommitteeMemberDialog({
  employees,
  open,
  onOpenChange,
  onSaved,
}: {
  employees: AssigneeRef[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [employeeId, setEmployeeId] = useState("")
  const [isPresidingOfficer, setIsPresidingOfficer] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (!employeeId) return
    setIsSubmitting(true)
    try {
      const result = await apiFetch("/api/posh/committee", { method: "POST", body: { employeeId, isPresidingOfficer } })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Committee member added")
      setEmployeeId("")
      setIsPresidingOfficer(false)
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
          <DialogTitle>Add committee member</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Presiding Officer</Label>
            <Switch checked={isPresidingOfficer} onCheckedChange={setIsPresidingOfficer} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !employeeId}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
