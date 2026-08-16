"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
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

type Onboarding = {
  id: string
  status: string
  documentsCollected: boolean
  documentsNotes: string | null
  orientationComplete: boolean
  orientationNotes: string | null
  initiatedBy: { email: string }
  completedAt: string | null
  cancelledAt: string | null
  createdAt: string
}

type AssetAssignment = { id: string; status: string }

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

export function OnboardingTab({ employeeId, hasPortalAccess }: { employeeId: string; hasPortalAccess: boolean }) {
  const router = useRouter()
  const [active, setActive] = useState<Onboarding | null | undefined>(undefined)
  const [history, setHistory] = useState<Onboarding[]>([])
  const [assignments, setAssignments] = useState<AssetAssignment[] | null>(null)
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [busy, setBusy] = useState(false)

  const [documentsCollected, setDocumentsCollected] = useState(false)
  const [documentsNotes, setDocumentsNotes] = useState("")
  const [orientationComplete, setOrientationComplete] = useState(false)
  const [orientationNotes, setOrientationNotes] = useState("")

  async function load() {
    const [onResult, assetsResult] = await Promise.all([
      apiFetch<{ active: Onboarding | null; history: Onboarding[] }>(`/api/employees/${employeeId}/onboarding`),
      apiFetch<{ assignments: AssetAssignment[] }>(`/api/employees/${employeeId}/assets`),
    ])
    if (onResult.success) {
      setActive(onResult.data.active)
      setHistory(onResult.data.history)
      if (onResult.data.active) {
        setDocumentsCollected(onResult.data.active.documentsCollected)
        setDocumentsNotes(onResult.data.active.documentsNotes ?? "")
        setOrientationComplete(onResult.data.active.orientationComplete)
        setOrientationNotes(onResult.data.active.orientationNotes ?? "")
      }
    }
    if (assetsResult.success) setAssignments(assetsResult.data.assignments)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  const assignedAssets = assignments?.filter((a) => a.status === "ASSIGNED") ?? []

  async function handleInitiate() {
    setBusy(true)
    try {
      const result = await apiFetch(`/api/employees/${employeeId}/onboarding`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Onboarding started")
      await load()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function saveChecklist(next: { documentsCollected: boolean; documentsNotes: string; orientationComplete: boolean; orientationNotes: string }) {
    if (!active) return
    const result = await apiFetch(`/api/onboarding/${active.id}/checklist`, { method: "PATCH", body: next })
    if (!result.success) toast.error(result.error.message)
  }

  async function handleComplete() {
    if (!active) return
    setBusy(true)
    try {
      const result = await apiFetch(`/api/onboarding/${active.id}/complete`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Onboarding completed")
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
      const result = await apiFetch(`/api/onboarding/${active.id}/cancel`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Onboarding cancelled")
      setConfirmCancel(false)
      await load()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (active === undefined) return <Skeleton className="h-48 w-full" />

  const canComplete = documentsCollected && orientationComplete

  return (
    <div className="flex flex-col gap-4">
      {active ? (
        <Card>
          <CardContent className="flex flex-col gap-5 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Onboarding checklist</p>
                <p className="text-xs text-muted-foreground">
                  Started {format(new Date(active.createdAt), "dd MMM yyyy")} by {active.initiatedBy.email}
                </p>
              </div>
              <Badge variant="secondary">In progress</Badge>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <ChecklistRow done={assignedAssets.length > 0} label="Assets issued">
                <Badge variant="outline" className="ml-1">
                  {assignedAssets.length === 0 ? "None yet" : `${assignedAssets.length} assigned`}
                </Badge>
              </ChecklistRow>
              <ChecklistRow done={hasPortalAccess} label="Portal access granted" />

              <div className="flex items-center gap-2">
                <Checkbox
                  id="documents"
                  checked={documentsCollected}
                  onCheckedChange={(v) => {
                    const next = v === true
                    setDocumentsCollected(next)
                    saveChecklist({ documentsCollected: next, documentsNotes, orientationComplete, orientationNotes })
                  }}
                />
                <label htmlFor="documents" className="text-sm">
                  Documents collected (ID proof, certificates, etc.)
                </label>
              </div>
              <Textarea
                placeholder="Notes on documents collected (optional)"
                rows={2}
                value={documentsNotes}
                onChange={(e) => setDocumentsNotes(e.target.value)}
                onBlur={() => saveChecklist({ documentsCollected, documentsNotes, orientationComplete, orientationNotes })}
              />

              <div className="flex items-center gap-2">
                <Checkbox
                  id="orientation"
                  checked={orientationComplete}
                  onCheckedChange={(v) => {
                    const next = v === true
                    setOrientationComplete(next)
                    saveChecklist({ documentsCollected, documentsNotes, orientationComplete: next, orientationNotes })
                  }}
                />
                <label htmlFor="orientation" className="text-sm">
                  Orientation / induction complete
                </label>
              </div>
              <Textarea
                placeholder="Orientation notes (optional)"
                rows={2}
                value={orientationNotes}
                onChange={(e) => setOrientationNotes(e.target.value)}
                onBlur={() => saveChecklist({ documentsCollected, documentsNotes, orientationComplete, orientationNotes })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmCancel(true)} disabled={busy}>
                Cancel onboarding
              </Button>
              <Button onClick={() => setConfirmComplete(true)} disabled={busy || !canComplete}>
                Complete onboarding
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <p className="text-sm text-muted-foreground">
              Track this new hire&apos;s onboarding — documents, assets, portal access, and orientation.
            </p>
            <div className="flex justify-end">
              <Button onClick={handleInitiate} disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                Start onboarding
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
                  {h.status === "COMPLETED" ? "Completed" : "Cancelled"} on{" "}
                  {format(new Date(h.completedAt ?? h.cancelledAt ?? h.createdAt), "dd MMM yyyy")}
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmComplete} onOpenChange={setConfirmComplete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete onboarding?</AlertDialogTitle>
            <AlertDialogDescription>Marks this employee&apos;s onboarding checklist as done.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Complete onboarding
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this onboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              The employee record itself is unaffected — this just stops checklist tracking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={busy} className="bg-destructive text-white hover:bg-destructive/90">
              {busy && <Loader2 className="animate-spin" />}
              Cancel onboarding
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
