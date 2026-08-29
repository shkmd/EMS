"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, UserPlus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api-client"

type CommitteeMemberOption = { id: string; name: string }
type AdminCaseRow = {
  id: string
  caseNumber: string
  status: string
  createdAt: string
  resolvedAt: string | null
  assignments: { committeeMember: { id: string; employee: { firstName: string; lastName: string } } }[]
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  INQUIRY_IN_PROGRESS: "Inquiry In Progress",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
}

export function AdminCasesList({ initialCases, committeeOptions }: { initialCases: AdminCaseRow[]; committeeOptions: CommitteeMemberOption[] }) {
  const [cases, setCases] = useState(initialCases)
  const [assignTarget, setAssignTarget] = useState<AdminCaseRow | null>(null)

  function reload() {
    apiFetch<{ cases: AdminCaseRow[] }>("/api/posh/cases").then((r) => r.success && setCases(r.data.cases))
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="mb-4 text-xs text-muted-foreground">
          For confidentiality, complaint details are visible only to the committee members assigned to each case — not shown here.
        </p>
        {cases.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No cases have been filed.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case #</TableHead>
                  <TableHead>Filed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.caseNumber}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{STATUS_LABELS[c.status] ?? c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.assignments.length === 0
                        ? "Unassigned"
                        : c.assignments.map((a) => `${a.committeeMember.employee.firstName} ${a.committeeMember.employee.lastName}`).join(", ")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setAssignTarget(c)}>
                        <UserPlus className="size-3.5" /> Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AssignCommitteeDialog
        caseRow={assignTarget}
        committeeOptions={committeeOptions}
        open={!!assignTarget}
        onOpenChange={(open) => !open && setAssignTarget(null)}
        onSaved={reload}
      />
    </Card>
  )
}

function AssignCommitteeDialog({
  caseRow,
  committeeOptions,
  open,
  onOpenChange,
  onSaved,
}: {
  caseRow: AdminCaseRow | null
  committeeOptions: CommitteeMemberOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const alreadyAssignedIds = caseRow?.assignments.map((a) => a.committeeMember.id) ?? []
  const options = committeeOptions.filter((o) => !alreadyAssignedIds.includes(o.id))

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  async function handleSubmit() {
    if (!caseRow || selected.length === 0) return
    setIsSubmitting(true)
    try {
      const result = await apiFetch(`/api/posh/cases/${caseRow.id}/assign`, { method: "POST", body: { committeeMemberIds: selected } })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Committee members assigned")
      setSelected([])
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
          <DialogTitle>Assign committee members</DialogTitle>
          <DialogDescription>Case {caseRow?.caseNumber} — assignees will get access to the full complaint.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">Everyone on the committee is already assigned to this case.</p>
          ) : (
            options.map((o) => (
              <label key={o.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                <Checkbox checked={selected.includes(o.id)} onCheckedChange={() => toggle(o.id)} />
                {o.name}
              </label>
            ))
          )}
        </div>
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
