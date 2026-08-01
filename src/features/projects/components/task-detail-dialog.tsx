"use client"

import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Download, Loader2, Paperclip, Pencil, Plus, Send, Trash2, X } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"
import { initials } from "@/features/messaging/lib/initials"
import { TaskFormDialog } from "@/features/projects/components/task-form-dialog"
import {
  TASK_PRIORITY_BADGE,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_BADGE,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
} from "@/features/projects/lib/labels"
import type { AssigneeRef, TaskExtras, TaskFeedItem, TaskItem } from "@/features/projects/lib/types"

function FeedAvatar({ actor }: { actor: { name: string; profilePhotoUrl: string | null; employeeId: string | null } }) {
  return (
    <Avatar className="size-7 shrink-0">
      {actor.employeeId && <AvatarImage src={`/api/employees/${actor.employeeId}/photo`} />}
      <AvatarFallback className="text-xs">{initials(actor.name)}</AvatarFallback>
    </Avatar>
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function TaskDetailDialog({
  projectId,
  task,
  assignableEmployees,
  canManage,
  currentEmployeeId,
  currentUserId,
  open,
  onOpenChange,
  onTaskSaved,
}: {
  projectId: string
  task: TaskItem | null
  assignableEmployees: AssigneeRef[]
  canManage: boolean
  currentEmployeeId: string | null
  currentUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskSaved: () => void
}) {
  const [feed, setFeed] = useState<TaskFeedItem[] | null>(null)
  const [comment, setComment] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [extras, setExtras] = useState<TaskExtras | null>(null)
  const [newChecklistText, setNewChecklistText] = useState("")
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || !task) return
    setFeed(null)
    setExtras(null)
    apiFetch<{ feed: TaskFeedItem[] }>(`/api/projects/${projectId}/tasks/${task.id}/feed`).then((result) => {
      if (result.success) setFeed(result.data.feed)
      else toast.error(result.error.message)
    })
    apiFetch<TaskExtras>(`/api/projects/${projectId}/tasks/${task.id}/extras`).then((result) => {
      if (result.success) setExtras(result.data)
      else toast.error(result.error.message)
    })
  }, [open, task, projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [feed?.length])

  if (!task) return null

  const canChangeStatus = canManage || (currentEmployeeId !== null && task.assignees.some((a) => a.id === currentEmployeeId))
  const canEditExtras = canChangeStatus

  async function refreshExtras() {
    if (!task) return
    const result = await apiFetch<TaskExtras>(`/api/projects/${projectId}/tasks/${task.id}/extras`)
    if (result.success) setExtras(result.data)
  }

  async function handleStatusChange(status: string) {
    if (!task) return
    const result = await apiFetch(`/api/projects/${projectId}/tasks/${task.id}/status`, {
      method: "PATCH",
      body: { status },
    })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    onTaskSaved()
  }

  async function handlePostComment() {
    if (!task || !comment.trim()) return
    setIsPosting(true)
    const result = await apiFetch<{ comment: { id: string; body: string; createdAt: string } }>(
      `/api/projects/${projectId}/tasks/${task.id}/comments`,
      { method: "POST", body: { body: comment.trim() } }
    )
    setIsPosting(false)
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    setComment("")
    const refreshed = await apiFetch<{ feed: TaskFeedItem[] }>(`/api/projects/${projectId}/tasks/${task.id}/feed`)
    if (refreshed.success) setFeed(refreshed.data.feed)
  }

  async function handleAddChecklistItem() {
    if (!task || !newChecklistText.trim()) return
    const result = await apiFetch(`/api/projects/${projectId}/tasks/${task.id}/checklist`, {
      method: "POST",
      body: { text: newChecklistText.trim() },
    })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    setNewChecklistText("")
    refreshExtras()
  }

  async function handleToggleChecklistItem(itemId: string, isDone: boolean) {
    if (!task) return
    const result = await apiFetch(`/api/projects/${projectId}/tasks/${task.id}/checklist/${itemId}`, {
      method: "PATCH",
      body: { isDone },
    })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    refreshExtras()
  }

  async function handleDeleteChecklistItem(itemId: string) {
    if (!task) return
    const result = await apiFetch(`/api/projects/${projectId}/tasks/${task.id}/checklist/${itemId}`, { method: "DELETE" })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    refreshExtras()
  }

  async function handleAddSubtask() {
    if (!task || !newSubtaskTitle.trim()) return
    const result = await apiFetch(`/api/projects/${projectId}/tasks/${task.id}/subtasks`, {
      method: "POST",
      body: { title: newSubtaskTitle.trim() },
    })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    setNewSubtaskTitle("")
    refreshExtras()
  }

  async function handleToggleSubtask(subtaskId: string, isDone: boolean) {
    const result = await apiFetch(`/api/projects/${projectId}/tasks/${subtaskId}/status`, {
      method: "PATCH",
      body: { status: isDone ? "DONE" : "TODO" },
    })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    refreshExtras()
  }

  async function handleDeleteSubtask(subtaskId: string) {
    const result = await apiFetch(`/api/projects/${projectId}/tasks/${subtaskId}`, { method: "DELETE" })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    refreshExtras()
  }

  async function handleFileChosen(file: File | undefined) {
    if (!task || !file) return
    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch(`/api/projects/${projectId}/tasks/${task.id}/attachments`, {
      method: "POST",
      body: formData,
      credentials: "include",
    })
    const result = await res.json()
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    refreshExtras()
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!task) return
    const result = await apiFetch(`/api/projects/${projectId}/tasks/${task.id}/attachments/${attachmentId}`, {
      method: "DELETE",
    })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    refreshExtras()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[95vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]">
          <DialogHeader className="border-b p-4">
            <div className="flex items-start justify-between gap-2 pr-8">
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
              {canManage && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil /> Edit
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1">
            <div className="flex w-3/5 flex-col gap-5 overflow-y-auto border-r p-4">
              <div className="grid grid-cols-[5rem_1fr] items-center gap-y-3 text-sm">
                <span className="text-muted-foreground">Status</span>
                {canChangeStatus ? (
                  <Select value={task.status} onValueChange={handleStatusChange}>
                    <SelectTrigger size="sm" className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          {TASK_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={cn("w-fit", TASK_STATUS_BADGE[task.status])}>{TASK_STATUS_LABEL[task.status]}</Badge>
                )}

                <span className="text-muted-foreground">Assignees</span>
                <div className="flex flex-wrap items-center gap-2">
                  {task.assignees.length === 0 ? (
                    <span className="text-muted-foreground">Unassigned</span>
                  ) : (
                    task.assignees.map((a) => (
                      <div key={a.id} className="flex items-center gap-1.5">
                        <Avatar className="size-5">
                          {a.profilePhotoUrl && <AvatarImage src={`/api/employees/${a.id}/photo`} />}
                          <AvatarFallback className="text-[9px]">{initials(a.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{a.name}</span>
                      </div>
                    ))
                  )}
                </div>

                <span className="text-muted-foreground">Priority</span>
                <Badge className={cn("w-fit", TASK_PRIORITY_BADGE[task.priority])}>{TASK_PRIORITY_LABEL[task.priority]}</Badge>

                <span className="text-muted-foreground">Start</span>
                <span>{task.startDate ? format(new Date(task.startDate), "MMM d, yyyy") : "—"}</span>

                <span className="text-muted-foreground">Due</span>
                <span>{task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "—"}</span>
              </div>

              <div className="flex flex-col gap-1.5 border-t pt-4">
                <span className="text-sm font-medium text-muted-foreground">Description</span>
                <p className="text-sm whitespace-pre-wrap">{task.description || "No description."}</p>
              </div>

              <div className="flex flex-col gap-2 border-t pt-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Subtasks{extras && extras.subtasks.length > 0 ? ` (${extras.subtasks.filter((s) => s.status === "DONE").length}/${extras.subtasks.length})` : ""}
                </span>
                {extras?.subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={s.status === "DONE"}
                      onCheckedChange={(checked) => handleToggleSubtask(s.id, checked === true)}
                      disabled={!canManage}
                    />
                    <span className={cn("flex-1 text-sm", s.status === "DONE" && "text-muted-foreground line-through")}>
                      {s.title}
                    </span>
                    {canManage && (
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteSubtask(s.id)}>
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                {canManage && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                      placeholder="Add subtask…"
                      className="h-8 text-sm"
                    />
                    <Button variant="outline" size="icon-sm" onClick={handleAddSubtask} disabled={!newSubtaskTitle.trim()}>
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 border-t pt-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Checklist{extras && extras.checklistItems.length > 0 ? ` (${extras.checklistItems.filter((i) => i.isDone).length}/${extras.checklistItems.length})` : ""}
                </span>
                {extras?.checklistItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={item.isDone}
                      onCheckedChange={(checked) => handleToggleChecklistItem(item.id, checked === true)}
                      disabled={!canEditExtras}
                    />
                    <span className={cn("flex-1 text-sm", item.isDone && "text-muted-foreground line-through")}>
                      {item.text}
                    </span>
                    {canEditExtras && (
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteChecklistItem(item.id)}>
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                {canEditExtras && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem()}
                      placeholder="Add checklist item…"
                      className="h-8 text-sm"
                    />
                    <Button variant="outline" size="icon-sm" onClick={handleAddChecklistItem} disabled={!newChecklistText.trim()}>
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 border-t pt-4">
                <span className="text-sm font-medium text-muted-foreground">Attachments</span>
                {extras?.attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
                    <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{a.fileName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(a.fileSize)}</span>
                    <a
                      href={`/api/projects/${projectId}/tasks/${task.id}/attachments/${a.id}`}
                      download
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <Download className="size-3.5" />
                    </a>
                    {(canManage || a.uploadedBy.id === currentUserId) && (
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteAttachment(a.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                {canEditExtras && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      onChange={(e) => handleFileChosen(e.target.files?.[0])}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="animate-spin" /> : <Paperclip />}
                      Attach file
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex w-2/5 flex-col">
              <div className="border-b px-4 py-2.5 text-sm font-semibold">Activity</div>
              <div className="flex-1 overflow-y-auto p-4">
                {!feed ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : feed.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {feed.map((item) =>
                      item.kind === "comment" ? (
                        <div key={item.id} className="flex items-start gap-2">
                          <FeedAvatar actor={item.author} />
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-medium">{item.author.name}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {format(new Date(item.createdAt), "MMM d, p")}
                              </span>
                            </div>
                            <p className="rounded-md bg-muted px-2.5 py-1.5 text-sm whitespace-pre-wrap">{item.body}</p>
                          </div>
                        </div>
                      ) : (
                        <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FeedAvatar actor={item.actor} />
                          <span>
                            <span className="font-medium text-foreground">{item.actor.name}</span> {item.message}
                          </span>
                          <span className="ml-auto shrink-0">{format(new Date(item.createdAt), "MMM d, p")}</span>
                        </div>
                      )
                    )}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>
              <div className="flex items-end gap-2 border-t p-3">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment…"
                  rows={1}
                  className="max-h-32 min-h-9 flex-1 resize-none py-2"
                  disabled={isPosting}
                />
                <Button size="icon" onClick={handlePostComment} disabled={isPosting || !comment.trim()}>
                  {isPosting ? <Loader2 className="animate-spin" /> : <Send />}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {canManage && (
        <TaskFormDialog
          projectId={projectId}
          target={task}
          assignableEmployees={assignableEmployees}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={onTaskSaved}
        />
      )}
    </>
  )
}
