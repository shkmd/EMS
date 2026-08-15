"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2, RotateCcw, Save, Trash2, Upload } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  templateTypeValues,
  TEMPLATE_LABELS,
  TEMPLATE_PLACEHOLDERS,
  IMAGE_PLACEHOLDER_TOKEN,
  type TemplateType,
} from "@/features/hr-documents/templates"

type TemplateRow = {
  type: TemplateType
  label: string
  title: string
  bodyText: string
  hasImage: boolean
  isCustomized: boolean
  updatedAt: string | null
  updatedByEmail: string | null
}

export function DocumentTemplatesManager() {
  const [templates, setTemplates] = useState<TemplateRow[] | null>(null)
  const [selectedType, setSelectedType] = useState<TemplateType>("RELIEVING_LETTER")
  const [title, setTitle] = useState("")
  const [bodyText, setBodyText] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isRemovingImage, setIsRemovingImage] = useState(false)
  const [imageVersion, setImageVersion] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const result = await apiFetch<{ templates: TemplateRow[] }>("/api/settings/document-templates")
    if (result.success) setTemplates(result.data.templates)
  }

  useEffect(() => {
    load()
  }, [])

  const current = templates?.find((t) => t.type === selectedType)

  useEffect(() => {
    if (current) {
      setTitle(current.title)
      setBodyText(current.bodyText)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.type, templates])

  async function handleSave() {
    setIsSaving(true)
    try {
      const result = await apiFetch(`/api/settings/document-templates/${selectedType}`, {
        method: "PATCH",
        body: { title, bodyText },
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Template saved")
      await load()
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReset() {
    setIsResetting(true)
    try {
      const result = await apiFetch(`/api/settings/document-templates/${selectedType}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Reset to default wording")
      setConfirmReset(false)
      await load()
    } finally {
      setIsResetting(false)
    }
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/settings/document-templates/${selectedType}/image`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })
      const result = await res.json()
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Image uploaded")
      setImageVersion((v) => v + 1)
      if (!bodyText.includes(IMAGE_PLACEHOLDER_TOKEN)) {
        setBodyText((prev) => `${prev}\n\n${IMAGE_PLACEHOLDER_TOKEN}`)
      }
      await load()
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleRemoveImage() {
    setIsRemovingImage(true)
    try {
      const result = await apiFetch(`/api/settings/document-templates/${selectedType}/image`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Image removed")
      await load()
    } finally {
      setIsRemovingImage(false)
    }
  }

  if (!templates) return <Skeleton className="h-96 w-full" />

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Templates</CardTitle>
        <CardDescription>
          Customize the wording HR-generated documents use. Insert placeholders like{" "}
          <code className="rounded bg-muted px-1">{"{{employeeName}}"}</code> anywhere — they&apos;re swapped in
          automatically when a document is generated.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedType} onValueChange={(v) => setSelectedType(v as TemplateType)}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templateTypeValues.map((t) => (
                <SelectItem key={t} value={t}>
                  {TEMPLATE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {current?.isCustomized ? (
            <Badge variant="secondary">Customized{current.updatedByEmail && ` by ${current.updatedByEmail}`}</Badge>
          ) : (
            <Badge variant="outline">Using default wording</Badge>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Document title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Body</label>
          <Textarea rows={12} value={bodyText} onChange={(e) => setBodyText(e.target.value)} className="font-mono text-sm" />
          <p className="text-xs text-muted-foreground">
            Leave a blank line between paragraphs. Include{" "}
            <code className="rounded bg-muted px-1">{IMAGE_PLACEHOLDER_TOKEN}</code> on its own line to place an uploaded
            image there.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-lg border p-3">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {current?.hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/settings/document-templates/${selectedType}/image?v=${imageVersion}`}
                alt="Template image"
                className="size-full object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground">None</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Image (e.g. a seal)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageSelected}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={isUploadingImage} onClick={() => fileInputRef.current?.click()}>
                {isUploadingImage ? <Loader2 className="animate-spin" /> : <Upload />}
                Upload
              </Button>
              {current?.hasImage && (
                <Button type="button" variant="outline" size="sm" disabled={isRemovingImage} onClick={handleRemoveImage}>
                  {isRemovingImage ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Uploading auto-inserts <code className="rounded bg-muted px-0.5">{IMAGE_PLACEHOLDER_TOKEN}</code> into the body
              if it isn&apos;t already there — move it wherever you want the image to appear.
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-medium">Available placeholders for {TEMPLATE_LABELS[selectedType]}</p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_PLACEHOLDERS[selectedType].map((p) => (
              <span
                key={p.key}
                title={p.description}
                className="cursor-help rounded bg-background px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
              >
                {`{{${p.key}}}`}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmReset(true)} disabled={!current?.isCustomized || isSaving}>
            <RotateCcw /> Reset to default
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            Save
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to default wording?</AlertDialogTitle>
            <AlertDialogDescription>
              This discards your customized {TEMPLATE_LABELS[selectedType]} text and goes back to the built-in default.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={isResetting} className="bg-destructive text-white hover:bg-destructive/90">
              {isResetting && <Loader2 className="animate-spin" />}
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
