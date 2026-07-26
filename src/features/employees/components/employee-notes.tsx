"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { Loader2, StickyNote } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api-client"
import { employeeNoteSchema } from "@/features/employees/schemas"

export type EmployeeNoteItem = {
  id: string
  note: string
  createdAt: Date | string
  author: { id: string; email: string }
}

export function EmployeeNotes({ employeeId, notes }: { employeeId: string; notes: EmployeeNoteItem[] }) {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    const parsed = employeeNoteSchema.safeParse({ note: value })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid note")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await apiFetch(`/api/employees/${employeeId}/notes`, {
        method: "POST",
        body: parsed.data,
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      setValue("")
      router.refresh()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Add a note about this employee..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !value.trim()}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Add note
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          <StickyNote className="size-8 opacity-50" />
          <p className="text-sm">No notes yet</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border p-3">
              <p className="whitespace-pre-wrap text-sm">{n.note}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {n.author.email} · {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
