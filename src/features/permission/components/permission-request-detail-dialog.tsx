"use client"

import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PERMISSION_STATUS_BADGE, PERMISSION_STATUS_LABELS } from "@/features/permission/lib/status-labels"
import { formatTime12h } from "@/features/permission/lib/time"

export type PermissionRequestDetail = {
  id: string
  date: string
  fromTime: string | null
  toTime: string | null
  hours: number
  reason: string
  status: string
  createdAt: string
  employee: { firstName: string; lastName: string }
  manager: { firstName: string; lastName: string } | null
  managerActionAt: string | null
  managerComment: string | null
  hr: { firstName: string; lastName: string } | null
  hrActionAt: string | null
  hrComment: string | null
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  )
}

export function PermissionRequestDetailDialog({
  request,
  open,
  onOpenChange,
}: {
  request: PermissionRequestDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {request ? `${request.employee.firstName} ${request.employee.lastName} — Permission` : "Permission request"}
          </DialogTitle>
        </DialogHeader>
        {request && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date">{format(new Date(request.date), "dd MMM yyyy")}</Field>
              <Field label="Time">
                {request.fromTime && request.toTime
                  ? `${formatTime12h(request.fromTime)} – ${formatTime12h(request.toTime)}`
                  : `${request.hours}h`}
              </Field>
              <Field label="Hours">{request.hours}</Field>
              <Field label="Status">
                <Badge className={PERMISSION_STATUS_BADGE[request.status]}>
                  {PERMISSION_STATUS_LABELS[request.status] ?? request.status}
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
