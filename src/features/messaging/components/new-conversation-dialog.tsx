"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Search } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api-client"
import { initials } from "@/features/messaging/lib/initials"
import type { ParticipantRef } from "@/features/messaging/lib/types"

export function NewConversationDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (userId: string) => void
}) {
  const [users, setUsers] = useState<ParticipantRef[] | null>(null)
  const [search, setSearch] = useState("")
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!open) return
    setSearch("")
    apiFetch<{ users: ParticipantRef[] }>("/api/messages/users").then((result) => {
      if (result.success) setUsers(result.data.users)
      else toast.error(result.error.message)
    })
  }, [open])

  const filtered = (users ?? []).filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))

  async function handleSelect(userId: string) {
    setStarting(true)
    try {
      await onSelect(userId)
      onOpenChange(false)
    } finally {
      setStarting(false)
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
          <Input
            placeholder="Search people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex max-h-80 flex-col overflow-y-auto">
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
                disabled={starting}
                onClick={() => handleSelect(u.id)}
                className="flex items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
              >
                <Avatar className="size-8">
                  {u.employeeId && <AvatarImage src={`/api/employees/${u.employeeId}/photo`} />}
                  <AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback>
                </Avatar>
                <span>{u.name}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
