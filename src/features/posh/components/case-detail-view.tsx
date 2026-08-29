"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2, Paperclip, UploadCloud } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api-client"

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  INQUIRY_IN_PROGRESS: "Inquiry In Progress",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
}

type EvidenceItem = { id: string; fileName: string; uploadedAt: string }

type ComplainantCase = {
  id: string
  caseNumber: string
  respondentName: string
  incidentDate: string | null
  description: string
  status: string
  outcome: string | null
  resolvedAt: string | null
  createdAt: string
  evidence: EvidenceItem[]
}

type CommitteeCase = ComplainantCase & {
  complainant: { id: string; firstName: string; lastName: string }
  respondentEmployee: { id: string; firstName: string; lastName: string } | null
  updates: { id: string; note: string; createdAt: string; author: { id: string; email: string } }[]
}

export function CaseDetailView({ viewAs, initialCase }: { viewAs: "committee" | "complainant"; initialCase: ComplainantCase | CommitteeCase }) {
  const [poshCase, setPoshCase] = useState(initialCase)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reload() {
    apiFetch<{ viewAs: "committee" | "complainant"; case: ComplainantCase | CommitteeCase }>(`/api/posh/cases/${poshCase.id}`).then(
      (r) => r.success && setPoshCase(r.data.case)
    )
  }

  async function handleEvidenceUpload(file: File) {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/posh/cases/${poshCase.id}/evidence`, { method: "POST", body: formData, credentials: "include" })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error?.message ?? "Upload failed")
        return
      }
      toast.success("Evidence uploaded")
      reload()
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const isFinal = poshCase.status === "RESOLVED" || poshCase.status === "DISMISSED"

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>{poshCase.caseNumber}</CardTitle>
            <p className="text-sm text-muted-foreground">Filed {new Date(poshCase.createdAt).toLocaleDateString()}</p>
          </div>
          <Badge variant="outline">{STATUS_LABELS[poshCase.status] ?? poshCase.status}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {viewAs === "committee" && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Complainant</p>
                <p>
                  {(poshCase as CommitteeCase).complainant.firstName} {(poshCase as CommitteeCase).complainant.lastName}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Respondent</p>
                <p>{poshCase.respondentName}</p>
              </div>
            </div>
          )}
          {viewAs === "complainant" && (
            <div>
              <p className="text-xs text-muted-foreground">Respondent</p>
              <p className="text-sm">{poshCase.respondentName}</p>
            </div>
          )}
          {poshCase.incidentDate && (
            <div>
              <p className="text-xs text-muted-foreground">Incident date</p>
              <p className="text-sm">{new Date(poshCase.incidentDate).toLocaleDateString()}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{poshCase.description}</p>
          </div>

          {poshCase.outcome && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Outcome</p>
              <p className="whitespace-pre-wrap text-sm">{poshCase.outcome}</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs text-muted-foreground">Evidence</p>
            <div className="flex flex-col gap-2">
              {poshCase.evidence.map((e) => (
                <a
                  key={e.id}
                  href={`/api/posh/evidence/${e.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Paperclip className="size-3.5" /> {e.fileName}
                </a>
              ))}
              {poshCase.evidence.length === 0 && <p className="text-sm text-muted-foreground">No evidence attached.</p>}
            </div>
            {!isFinal && (
              <div className="mt-2">
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleEvidenceUpload(e.target.files[0])} />
                <Button variant="outline" size="sm" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
                  {isUploading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                  Add evidence
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {viewAs === "committee" && <CommitteeCaseTools poshCase={poshCase as CommitteeCase} onChanged={reload} />}
    </div>
  )
}

function CommitteeCaseTools({ poshCase, onChanged }: { poshCase: CommitteeCase; onChanged: () => void }) {
  const [note, setNote] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [status, setStatus] = useState(poshCase.status)
  const [outcome, setOutcome] = useState(poshCase.outcome ?? "")
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const isFinal = poshCase.status === "RESOLVED" || poshCase.status === "DISMISSED"

  async function handleAddNote() {
    if (!note.trim()) return
    setIsAddingNote(true)
    try {
      const result = await apiFetch(`/api/posh/cases/${poshCase.id}/updates`, { method: "POST", body: { note } })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      setNote("")
      onChanged()
    } finally {
      setIsAddingNote(false)
    }
  }

  async function handleUpdateStatus() {
    setIsUpdatingStatus(true)
    try {
      const result = await apiFetch(`/api/posh/cases/${poshCase.id}/status`, { method: "PATCH", body: { status, outcome: outcome || undefined } })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Status updated")
      onChanged()
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  return (
    <>
      {!isFinal && (
        <Card>
          <CardHeader>
            <CardTitle>Update status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS)
                    .filter(([value]) => value !== "SUBMITTED")
                    .map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {(status === "RESOLVED" || status === "DISMISSED") && (
              <div className="flex flex-col gap-2">
                <Label>Outcome</Label>
                <Textarea rows={4} value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Summary of the decision…" />
              </div>
            )}
            <Button className="w-fit" onClick={handleUpdateStatus} disabled={isUpdatingStatus}>
              {isUpdatingStatus && <Loader2 className="animate-spin" />}
              Update status
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Committee notes</CardTitle>
          <p className="text-xs text-muted-foreground">Internal only — never shown to the complainant.</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {poshCase.updates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              poshCase.updates.map((u) => (
                <div key={u.id} className="rounded-lg border p-3">
                  <p className="whitespace-pre-wrap text-sm">{u.note}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {u.author.email} · {new Date(u.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note…" />
            <Button className="w-fit" size="sm" onClick={handleAddNote} disabled={isAddingNote || !note.trim()}>
              {isAddingNote && <Loader2 className="animate-spin" />}
              Add note
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
