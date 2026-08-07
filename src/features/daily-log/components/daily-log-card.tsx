"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api-client"

type DailyLogRow = { note: string; updatedAt: string } | null

export function DailyLogCard() {
  const [note, setNote] = useState("")
  const [savedNote, setSavedNote] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    apiFetch<{ log: DailyLogRow }>("/api/daily-log").then((result) => {
      if (result.success) {
        setNote(result.data.log?.note ?? "")
        setSavedNote(result.data.log?.note ?? "")
      }
      setIsLoading(false)
    })
  }, [])

  async function handleSave() {
    setIsSaving(true)
    try {
      const result = await apiFetch<{ log: DailyLogRow }>("/api/daily-log", { method: "POST", body: { note } })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Today's update saved")
      setSavedNote(note)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Update</CardTitle>
        <CardDescription>What are you working on today? Visible to your manager.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Finished the payroll export bug fix, started on the leave-balance report..."
              rows={3}
              disabled={isSaving}
            />
            <Button onClick={handleSave} disabled={isSaving || !note.trim() || note === savedNote} className="self-end">
              {isSaving && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
