"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Camera, Loader2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

export function EmployeePhotoUpload({
  employeeId,
  firstName,
  lastName,
  hasPhoto,
  editable,
}: {
  employeeId: string
  firstName: string
  lastName: string
  hasPhoto: boolean
  editable: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [cacheBust, setCacheBust] = useState(0)

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/employees/${employeeId}/photo`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })
      const result = await res.json()
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Photo updated")
      setCacheBust((n) => n + 1)
      router.refresh()
    } catch {
      toast.error("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="relative">
      <Avatar className="size-20">
        {hasPhoto && <AvatarImage src={`/api/employees/${employeeId}/photo?v=${cacheBust}`} />}
        <AvatarFallback className="text-lg">{initials(firstName, lastName)}</AvatarFallback>
      </Avatar>
      {editable && (
        <>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelected} />
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            className="absolute -bottom-1 -right-1 rounded-full"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="animate-spin" /> : <Camera />}
          </Button>
        </>
      )}
    </div>
  )
}
