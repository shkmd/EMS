"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Search } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api-client"
import type { EmployeeRef } from "@/features/messaging/lib/types"

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (employeeId: string) => void
}) {
  const [employees, setEmployees] = useState<EmployeeRef[] | null>(null)
  const [search, setSearch] = useState("")
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!open) return
    setSearch("")
    apiFetch<{ employees: EmployeeRef[] }>("/api/messages/employees").then((result) => {
      if (result.success) setEmployees(result.data.employees)
      else toast.error(result.error.message)
    })
  }, [open])

  const filtered = (employees ?? []).filter((e) =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSelect(employeeId: string) {
    setStarting(true)
    try {
      await onSelect(employeeId)
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
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex max-h-80 flex-col overflow-y-auto">
          {!employees ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No employees found.</p>
          ) : (
            filtered.map((e) => (
              <button
                key={e.id}
                disabled={starting}
                onClick={() => handleSelect(e.id)}
                className="flex items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
              >
                <Avatar className="size-8">
                  {e.profilePhotoUrl && <AvatarImage src={`/api/employees/${e.id}/photo`} />}
                  <AvatarFallback className="text-xs">{initials(e.firstName, e.lastName)}</AvatarFallback>
                </Avatar>
                <span>
                  {e.firstName} {e.lastName}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
