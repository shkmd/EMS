"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { CheckCircle2, CircleDashed, Loader2, Undo2, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
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
import { ReturnAssetDialog } from "@/features/assets/components/return-asset-dialog"
import { exitReasonValues, type InitiateOffboardingInput } from "@/features/offboarding/schemas"

const REASON_LABELS: Record<string, string> = {
  RESIGNATION: "Resignation",
  TERMINATION: "Termination",
  RETIREMENT: "Retirement",
  END_OF_CONTRACT: "End of contract",
  OTHER: "Other",
}

type Offboarding = {
  id: string
  resignationDate: string | null
  lastWorkingDay: string
  reason: string
  reasonNotes: string | null
  status: string
  duesCleared: boolean
  handoverComplete: boolean
  handoverNotes: string | null
  initiatedBy: { email: string }
  completedAt: string | null
  cancelledAt: string | null
  createdAt: string
}

type AssetAssignment = {
  id: string
  status: string
  asset: { assetTag: string; name: string }
}

function ChecklistRow({ done, label, children }: { done: boolean; label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
      ) : (
        <CircleDashed className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      {children}
    </div>
  )
}

export function OffboardingTab({ employeeId, employeeStatus }: { employeeId: string; employeeStatus: string }) {
  const router = useRouter()
  const [active, setActive] = useState<Offboarding | null | undefined>(undefined)
  const [history, setHistory] = useState<Offboarding[]>([])
  const [assignments, setAssignments] = useState<AssetAssignment[] | null>(null)
  const [returningId, setReturningId] = useState<string | null>(null)
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [busy, setBusy] = useState(false)

  const [form, setForm] = useState<InitiateOffboardingInput>({
    resignationDate: "",
    lastWorkingDay: "",
    reason: "RESIGNATION",
    reasonNotes: "",
  })
  const [duesCleared, setDuesCleared] = useState(false)
  const [handoverComplete, setHandoverComplete] = useState(false)
  const [handoverNotes, setHandoverNotes] = useState("")

  async function load() {
    const [offResult, assetsResult] = await Promise.all([
      apiFetch<{ active: Offboarding | null; history: Offboarding[] }>(`/api/employees/${employeeId}/offboarding`),
      apiFetch<{ assignments: AssetAssignment[] }>(`/api/employees/${employeeId}/assets`),
    ])
    if (offResult.success) {
      setActive(offResult.data.active)
      setHistory(offResult.data.history)
      if (offResult.data.active) {
        setDuesCleared(offResult.data.active.duesCleared)
        setHandoverComplete(offResult.data.active.handoverComplete)
        setHandoverNotes(offResult.data.active.handoverNotes ?? "")
      }
    }
    if (assetsResult.success) setAssignments(assetsResult.data.assignments)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  const outstandingAssets = assignments?.filter((a) => a.status === "ASSIGNED") ?? []

  async function handleInitiate() {
    setBusy(true)
    try {
      const result = await apiFetch(`/api/employees/${employeeId}/offboarding`, { method: "POST", body: form })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Offboarding initiated")
      await load()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function saveChecklist(next: { duesCleared: boolean; handoverComplete: boolean; handoverNotes: string }) {
    if (!active) return
    const result = await apiFetch(`/api/offboarding/${active.id}/checklist`, { method: "PATCH", body: next })
    if (!result.success) toast.error(result.error.message)
  }

  async function handleComplete() {
    if (!active) return
    setBusy(true)
    try {
      const result = await apiFetch(`/api/offboarding/${active.id}/complete`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Offboarding completed — access has been revoked")
      setConfirmComplete(false)
      await load()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    if (!active) return
    setBusy(true)
    try {
      const result = await apiFetch(`/api/offboarding/${active.id}/cancel`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Offboarding cancelled")
      setConfirmCancel(false)
      await load()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (active === undefined) return <Skeleton className="h-48 w-full" />

  const canComplete = outstandingAssets.length === 0 && duesCleared && handoverComplete

  return (
    <div className="flex flex-col gap-4">
      {active ? (
        <Card>
          <CardContent className="flex flex-col gap-5 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{REASON_LABELS[active.reason] ?? active.reason}</p>
                <p className="text-xs text-muted-foreground">
                  Last working day: {format(new Date(active.lastWorkingDay), "dd MMM yyyy")}
                  {active.resignationDate && ` · Resigned: ${format(new Date(active.resignationDate), "dd MMM yyyy")}`}
                </p>
              </div>
              <Badge variant="secondary">In progress</Badge>
            </div>
            {active.reasonNotes && <p className="text-sm text-muted-foreground">{active.reasonNotes}</p>}

            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <ChecklistRow done={outstandingAssets.length === 0} label="All assets returned">
                {outstandingAssets.length > 0 && (
                  <Badge variant="outline" className="ml-1">
                    {outstandingAssets.length} outstanding
                  </Badge>
                )}
              </ChecklistRow>
              {outstandingAssets.length > 0 && (
                <ul className="ml-6 flex flex-col gap-1.5">
                  {outstandingAssets.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 text-xs">
                      <span>
                        {a.asset.name} <span className="text-muted-foreground">({a.asset.assetTag})</span>
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setReturningId(a.id)}>
                        <Undo2 className="size-3" /> Return
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="dues"
                  checked={duesCleared}
                  onCheckedChange={(v) => {
                    const next = v === true
                    setDuesCleared(next)
                    saveChecklist({ duesCleared: next, handoverComplete, handoverNotes })
                  }}
                />
                <label htmlFor="dues" className="text-sm">
                  No pending dues (expenses/advances settled outside the system)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="handover"
                  checked={handoverComplete}
                  onCheckedChange={(v) => {
                    const next = v === true
                    setHandoverComplete(next)
                    saveChecklist({ duesCleared, handoverComplete: next, handoverNotes })
                  }}
                />
                <label htmlFor="handover" className="text-sm">
                  Handover complete
                </label>
              </div>
              <Textarea
                placeholder="Handover notes (what was handed over, to whom, any pending items)"
                rows={2}
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                onBlur={() => saveChecklist({ duesCleared, handoverComplete, handoverNotes })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmCancel(true)} disabled={busy}>
                Cancel offboarding
              </Button>
              <Button onClick={() => setConfirmComplete(true)} disabled={busy || !canComplete}>
                Complete offboarding
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : employeeStatus === "TERMINATED" ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            This employee has already been offboarded.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <p className="text-sm text-muted-foreground">
              Start the exit process — track their last working day, asset return, and handover before their access is
              revoked.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Resignation date (optional)</label>
                <Input
                  type="date"
                  value={form.resignationDate}
                  onChange={(e) => setForm({ ...form, resignationDate: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Last working day</label>
                <Input
                  type="date"
                  value={form.lastWorkingDay}
                  onChange={(e) => setForm({ ...form, lastWorkingDay: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Reason</label>
              <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v as InitiateOffboardingInput["reason"] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exitReasonValues.map((r) => (
                    <SelectItem key={r} value={r}>
                      {REASON_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Notes (optional)"
              rows={2}
              value={form.reasonNotes}
              onChange={(e) => setForm({ ...form, reasonNotes: e.target.value })}
            />
            <div className="flex justify-end">
              <Button onClick={handleInitiate} disabled={busy || !form.lastWorkingDay}>
                {busy && <Loader2 className="animate-spin" />}
                Initiate offboarding
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {history.filter((h) => h.status !== "IN_PROGRESS").length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2 pt-6">
            <p className="text-sm font-medium">History</p>
            {history
              .filter((h) => h.status !== "IN_PROGRESS")
              .map((h) => (
                <div key={h.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  {h.status === "COMPLETED" ? (
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="size-3.5 text-muted-foreground" />
                  )}
                  {REASON_LABELS[h.reason] ?? h.reason} — {h.status === "COMPLETED" ? "Completed" : "Cancelled"} on{" "}
                  {format(new Date(h.completedAt ?? h.cancelledAt ?? h.createdAt), "dd MMM yyyy")}
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      <ReturnAssetDialog
        assignmentId={returningId}
        open={!!returningId}
        onOpenChange={(next) => {
          if (!next) setReturningId(null)
        }}
        onSaved={() => {
          setReturningId(null)
          load()
        }}
      />

      <AlertDialog open={confirmComplete} onOpenChange={setConfirmComplete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete offboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              This sets their status to Terminated and immediately revokes their portal login. This can&apos;t be undone
              from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Complete offboarding
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this offboarding?</AlertDialogTitle>
            <AlertDialogDescription>The employee&apos;s status and access are unaffected — nothing has changed for them yet.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={busy} className="bg-destructive text-white hover:bg-destructive/90">
              {busy && <Loader2 className="animate-spin" />}
              Cancel offboarding
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
