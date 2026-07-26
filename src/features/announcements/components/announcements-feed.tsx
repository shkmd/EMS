"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { Loader2, MessageCircle, MoreHorizontal, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { AnnouncementFormDialog, type AnnouncementEditTarget } from "@/features/announcements/components/announcement-form-dialog"
import { ANNOUNCEMENT_PRIORITY_BADGE } from "@/features/announcements/lib/labels"

type Announcement = {
  id: string
  title: string
  content: string
  priority: string
  isPinned: boolean
  publishedAt: string
  expiresAt: string | null
  targetDepartment: { id: string; name: string } | null
  author: { id: string; email: string; employee: { firstName: string; lastName: string } | null }
}

export function AnnouncementsFeed({ canManage }: { canManage: boolean }) {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AnnouncementEditTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pinningId, setPinningId] = useState<string | null>(null)

  async function load() {
    const result = await apiFetch<{ announcements: Announcement[] }>("/api/announcements")
    if (result.success) setAnnouncements(result.data.announcements)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(a: Announcement) {
    setEditTarget({
      id: a.id,
      title: a.title,
      content: a.content,
      priority: a.priority,
      targetDepartmentId: a.targetDepartment?.id ?? null,
      isPinned: a.isPinned,
      expiresAt: a.expiresAt,
    })
    setFormOpen(true)
  }

  async function togglePin(a: Announcement) {
    setPinningId(a.id)
    try {
      const result = await apiFetch(`/api/announcements/${a.id}/pin`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      load()
    } finally {
      setPinningId(null)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/announcements/${deleteTarget.id}`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Announcement deleted")
      setDeleteTarget(null)
      load()
    } finally {
      setIsDeleting(false)
    }
  }

  const authorName = (a: Announcement) => (a.author.employee ? `${a.author.employee.firstName} ${a.author.employee.lastName}` : a.author.email)

  function whatsAppShareUrl(a: Announcement) {
    const text = `*${a.title}*\n\n${a.content}`
    return `https://wa.me/?text=${encodeURIComponent(text)}`
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus /> New Announcement
          </Button>
        </div>
      )}

      {!announcements ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No announcements yet.</CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => {
            const isExpired = a.expiresAt ? new Date(a.expiresAt) < new Date() : false
            return (
              <Card key={a.id} className={isExpired ? "opacity-60" : undefined}>
                <CardContent className="flex flex-col gap-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.isPinned && <Pin className="size-3.5 fill-primary text-primary" />}
                      <h3 className="font-medium leading-none">{a.title}</h3>
                      <Badge className={ANNOUNCEMENT_PRIORITY_BADGE[a.priority]}>{a.priority}</Badge>
                      {isExpired && <Badge variant="outline">Expired</Badge>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon-sm" asChild title="Share to WhatsApp">
                        <a href={whatsAppShareUrl(a)} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="text-emerald-600 dark:text-emerald-400" />
                          <span className="sr-only">Share to WhatsApp</span>
                        </a>
                      </Button>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => togglePin(a)} disabled={pinningId === a.id}>
                              {a.isPinned ? <PinOff /> : <Pin />}
                              {a.isPinned ? "Unpin" : "Pin"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(a)}>
                              <Pencil /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(a)}>
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.content}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/80">
                    <span>{a.targetDepartment ? a.targetDepartment.name : "Company-wide"}</span>
                    <span>&middot;</span>
                    <span>By {authorName(a)}</span>
                    <span>&middot;</span>
                    <span>{formatDistanceToNow(new Date(a.publishedAt), { addSuffix: true })}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AnnouncementFormDialog
        target={editTarget}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditTarget(null)
        }}
        onSaved={load}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && <>This will remove &quot;{deleteTarget.title}&quot; for everyone.</>}
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
