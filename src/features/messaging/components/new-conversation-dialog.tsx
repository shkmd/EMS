"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Search, Users } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api-client"
import { initials } from "@/features/messaging/lib/initials"
import type { ParticipantRef } from "@/features/messaging/lib/types"

export function NewConversationDialog({
  open,
  onOpenChange,
  onStartConversation,
  onCreateGroup,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartConversation: (userId: string) => Promise<void>
  onCreateGroup: (name: string, userIds: string[]) => Promise<void>
}) {
  const [users, setUsers] = useState<ParticipantRef[] | null>(null)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [groupName, setGroupName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setSearch("")
    setSelected([])
    setGroupName("")
    apiFetch<{ users: ParticipantRef[] }>("/api/messages/users").then((result) => {
      if (result.success) setUsers(result.data.users)
      else toast.error(result.error.message)
    })
  }, [open])

  const filtered = (users ?? []).filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
  const isGroupSelection = selected.length >= 2

  function toggle(userId: string) {
    setSelected((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  async function handleStart() {
    if (selected.length !== 1) return
    setIsSubmitting(true)
    try {
      await onStartConversation(selected[0]!)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCreateGroup() {
    if (selected.length < 2 || !groupName.trim()) return
    setIsSubmitting(true)
    try {
      await onCreateGroup(groupName.trim(), selected)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search people…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex max-h-64 flex-col overflow-y-auto">
          {!users ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No one found.</p>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={isSubmitting}
                onClick={() => toggle(u.id)}
                className="flex items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
              >
                <Checkbox checked={selected.includes(u.id)} className="pointer-events-none" />
                <Avatar className="size-8">
                  {u.employeeId && <AvatarImage src={`/api/employees/${u.employeeId}/photo`} />}
                  <AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback>
                </Avatar>
                <span>{u.name}</span>
              </button>
            ))
          )}
        </div>

        {isGroupSelection && (
          <Input placeholder="Group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} maxLength={100} />
        )}

        <DialogFooter>
          {isGroupSelection ? (
            <Button onClick={handleCreateGroup} disabled={isSubmitting || !groupName.trim()}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Users />}
              Create group ({selected.length})
            </Button>
          ) : (
            <Button onClick={handleStart} disabled={isSubmitting || selected.length !== 1}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Message
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
