"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { ClipboardList, Loader2, Star, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
import { ReviewFormDialog } from "@/features/performance/components/review-form-dialog"
import { REVIEW_STATUS_BADGE } from "@/features/performance/lib/status-labels"

type Rating = { id: string; criterion: string; rating: number; comment: string | null }
type Review = {
  id: string
  reviewPeriodStart: string
  reviewPeriodEnd: string
  overallRating: string | null
  status: string
  summary: string | null
  reviewer: { id: string; email: string }
  ratings: Rating[]
}

export function ReviewsPanel({
  employeeId,
  canManage,
  isSelf,
}: {
  employeeId: string
  canManage: boolean
  isSelf: boolean
}) {
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [selected, setSelected] = useState<Review | null>(null)
  const [ackComment, setAckComment] = useState("")
  const [isActing, setIsActing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function load() {
    const result = await apiFetch<{ reviews: Review[] }>(`/api/performance/reviews?employeeId=${employeeId}`)
    if (result.success) setReviews(result.data.reviews)
  }

  useEffect(() => {
    load()
    setSelected(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  async function handleSubmit(review: Review) {
    setIsActing(true)
    try {
      const result = await apiFetch(`/api/performance/reviews/${review.id}/submit`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Review submitted")
      setSelected(null)
      load()
    } finally {
      setIsActing(false)
    }
  }

  async function handleAcknowledge(review: Review) {
    setIsActing(true)
    try {
      const result = await apiFetch(`/api/performance/reviews/${review.id}/acknowledge`, {
        method: "POST",
        body: { comment: ackComment },
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Review acknowledged")
      setAckComment("")
      setSelected(null)
      load()
    } finally {
      setIsActing(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/performance/reviews/${deleteTarget.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Draft deleted")
      setDeleteTarget(null)
      setSelected(null)
      load()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Performance Reviews</CardTitle>
          <CardDescription>{isSelf ? "Reviews about you." : "Reviews you've written."}</CardDescription>
        </div>
        {canManage && <ReviewFormDialog employeeId={employeeId} onSaved={load} />}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!reviews ? (
          <Skeleton className="h-32 w-full" />
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <ClipboardList className="size-8 opacity-50" />
            <p className="text-sm">No reviews yet</p>
          </div>
        ) : (
          reviews.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="flex items-center justify-between rounded-lg border p-3 text-left hover:bg-accent"
            >
              <div>
                <p className="font-medium">
                  {format(new Date(r.reviewPeriodStart), "dd MMM yyyy")} – {format(new Date(r.reviewPeriodEnd), "dd MMM yyyy")}
                </p>
                <p className="text-xs text-muted-foreground">by {r.reviewer.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {r.overallRating && (
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    {Number(r.overallRating).toFixed(1)}
                  </span>
                )}
                <Badge className={REVIEW_STATUS_BADGE[r.status]}>{r.status}</Badge>
              </div>
            </button>
          ))
        )}
      </CardContent>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Performance Review</SheetTitle>
                <SheetDescription>
                  {format(new Date(selected.reviewPeriodStart), "dd MMM yyyy")} –{" "}
                  {format(new Date(selected.reviewPeriodEnd), "dd MMM yyyy")}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4">
                <div className="flex items-center gap-2">
                  <Badge className={REVIEW_STATUS_BADGE[selected.status]}>{selected.status}</Badge>
                  {selected.overallRating && (
                    <span className="flex items-center gap-1 text-sm font-medium">
                      <Star className="size-4 fill-amber-400 text-amber-400" />
                      {Number(selected.overallRating).toFixed(1)} overall
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {selected.ratings.map((rt) => (
                    <div key={rt.id} className="rounded-lg border p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{rt.criterion}</span>
                        <span className="flex items-center gap-1 text-sm">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" />
                          {rt.rating}
                        </span>
                      </div>
                      {rt.comment && <p className="mt-1 text-sm text-muted-foreground">{rt.comment}</p>}
                    </div>
                  ))}
                </div>

                {selected.summary && (
                  <div>
                    <p className="text-sm font-medium">Summary</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selected.summary}</p>
                  </div>
                )}

                {isSelf && selected.status === "SUBMITTED" && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Acknowledge this review</p>
                    <Textarea
                      placeholder="Optional comment"
                      value={ackComment}
                      onChange={(e) => setAckComment(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </div>
              <SheetFooter>
                {canManage && selected.status === "DRAFT" && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDeleteTarget(selected)}>
                      <Trash2 /> Delete draft
                    </Button>
                    <Button onClick={() => handleSubmit(selected)} disabled={isActing}>
                      {isActing && <Loader2 className="animate-spin" />}
                      Submit review
                    </Button>
                  </div>
                )}
                {isSelf && selected.status === "SUBMITTED" && (
                  <Button onClick={() => handleAcknowledge(selected)} disabled={isActing}>
                    {isActing && <Loader2 className="animate-spin" />}
                    Acknowledge
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draft review?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
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
    </Card>
  )
}
