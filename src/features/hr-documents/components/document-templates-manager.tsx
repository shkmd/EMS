"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, RotateCcw, Save } from "lucide-react"

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
import { templateTypeValues, TEMPLATE_LABELS, TEMPLATE_PLACEHOLDERS, type TemplateType } from "@/features/hr-documents/templates"

type TemplateRow = {
  type: TemplateType
  label: string
  title: string
  bodyText: string
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
          <p className="text-xs text-muted-foreground">Leave a blank line between paragraphs.</p>
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
