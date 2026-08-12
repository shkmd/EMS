"use client"

import { format, isSameDay } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LEAVE_STATUS_BADGE, LEAVE_STATUS_LABELS } from "@/features/leave/lib/status-labels"

export type LeaveRequestDetail = {
  id: string
  startDate: string
  endDate: string
  duration: string
  days: number
  reason: string
  status: string
  createdAt: string
  leaveType: { name: string }
  employee: { firstName: string; lastName: string }
  manager: { firstName: string; lastName: string } | null
  managerActionAt: string | null
  managerComment: string | null
  hr: { firstName: string; lastName: string } | null
  hrActionAt: string | null
  hrComment: string | null
}

const DURATION_LABELS: Record<string, string> = {
  FULL_DAY: "Full day(s)",
  FIRST_HALF: "First half",
  SECOND_HALF: "Second half",
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  )
}

export function LeaveRequestDetailDialog({
  request,
  open,
  onOpenChange,
}: {
  request: LeaveRequestDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {request ? `${request.employee.firstName} ${request.employee.lastName} — ${request.leaveType.name}` : "Leave request"}
          </DialogTitle>
        </DialogHeader>
        {request && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Dates">
                {format(new Date(request.startDate), "dd MMM yyyy")}
                {!isSameDay(new Date(request.startDate), new Date(request.endDate)) &&
                  ` – ${format(new Date(request.endDate), "dd MMM yyyy")}`}
              </Field>
              <Field label="Days">{request.days}</Field>
              <Field label="Duration">{DURATION_LABELS[request.duration] ?? request.duration}</Field>
              <Field label="Status">
                <Badge className={LEAVE_STATUS_BADGE[request.status]}>
                  {LEAVE_STATUS_LABELS[request.status] ?? request.status}
                </Badge>
              </Field>
            </div>
            <Field label="Reason">
              <p className="whitespace-pre-wrap">{request.reason}</p>
            </Field>
            {request.manager && (
              <Field label={`Manager action — ${request.manager.firstName} ${request.manager.lastName}`}>
                {request.managerActionAt && (
                  <p className="text-muted-foreground">{format(new Date(request.managerActionAt), "dd MMM yyyy, h:mm a")}</p>
                )}
                {request.managerComment && <p className="whitespace-pre-wrap">{request.managerComment}</p>}
              </Field>
            )}
            {request.hr && (
              <Field label={`HR action — ${request.hr.firstName} ${request.hr.lastName}`}>
                {request.hrActionAt && (
                  <p className="text-muted-foreground">{format(new Date(request.hrActionAt), "dd MMM yyyy, h:mm a")}</p>
                )}
                {request.hrComment && <p className="whitespace-pre-wrap">{request.hrComment}</p>}
              </Field>
            )}
            <Field label="Requested on">{format(new Date(request.createdAt), "dd MMM yyyy, h:mm a")}</Field>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
