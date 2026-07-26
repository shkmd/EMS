"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { documentTypeValues } from "@/features/employees/schemas"

export type EmployeeDocumentItem = {
  id: string
  type: string
  fileName: string
  fileSize: number
  uploadedAt: Date | string
}

const TYPE_LABELS: Record<string, string> = {
  RESUME: "Resume",
  OFFER_LETTER: "Offer Letter",
  APPOINTMENT_LETTER: "Appointment Letter",
  ID_PROOF: "ID Proof",
  ADDRESS_PROOF: "Address Proof",
  EDUCATIONAL_CERTIFICATE: "Educational Certificate",
  EXPERIENCE_CERTIFICATE: "Experience Certificate",
  OTHER: "Other",
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function EmployeeDocuments({
  employeeId,
  documents,
  canManage,
}: {
  employeeId: string
  documents: EmployeeDocumentItem[]
  canManage: boolean
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState<string>("RESUME")
  const [isUploading, setIsUploading] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<EmployeeDocumentItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", docType)

      const res = await fetch(`/api/employees/${employeeId}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })
      const result = await res.json()

      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Document uploaded")
      router.refresh()
    } catch {
      toast.error("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!documentToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/documents/${documentToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const result = await res.json()
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Document deleted")
      setDocumentToDelete(null)
      router.refresh()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentTypeValues.map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileSelected}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
            Upload document
          </Button>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          <FileText className="size-8 opacity-50" />
          <p className="text-sm">No documents uploaded</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 p-3">
              <FileText className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABELS[doc.type] ?? doc.type} · {formatSize(doc.fileSize)}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" asChild>
                <a href={`/api/employees/${employeeId}/documents/${doc.id}`} download>
                  <Download />
                </a>
              </Button>
              {canManage && (
                <Button variant="ghost" size="icon-sm" onClick={() => setDocumentToDelete(doc)}>
                  <Trash2 className="text-destructive" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              {documentToDelete && <>This will permanently remove &quot;{documentToDelete.fileName}&quot;.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
