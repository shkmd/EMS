"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ImageUploadField({
  label,
  helpText,
  uploadUrl,
  previewUrl,
  hasImage,
  onUploaded,
}: {
  label: string
  helpText: string
  uploadUrl: string
  previewUrl: string
  hasImage: boolean
  onUploaded: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  async function onSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(uploadUrl, { method: "POST", body: formData, credentials: "include" })
      const result = await res.json()
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(`${label} updated`)
      onUploaded()
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={label} className="size-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{label}</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onSelected}
        />
        <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
          {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
          Upload
        </Button>
        <p className="text-xs text-muted-foreground">{helpText}</p>
      </div>
    </div>
  )
}
