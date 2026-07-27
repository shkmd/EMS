"use client"

import { formatDistanceToNow } from "date-fns"
import { Plus } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ConversationSummary } from "@/features/messaging/lib/types"

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNewConversation,
}: {
  conversations: ConversationSummary[]
  activeId: string | null
  onSelect: (id: string) => void
  onNewConversation: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-semibold">Messages</h2>
        <Button variant="ghost" size="icon-sm" onClick={onNewConversation}>
          <Plus />
          <span className="sr-only">New conversation</span>
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
            <p>No conversations yet.</p>
            <Button variant="outline" size="sm" onClick={onNewConversation}>
              <Plus /> Start a conversation
            </Button>
          </div>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "flex w-full items-center gap-3 border-b px-3 py-3 text-left hover:bg-accent/50",
                activeId === c.id && "bg-accent"
              )}
            >
              <Avatar className="size-9 shrink-0">
                {c.other.profilePhotoUrl && <AvatarImage src={`/api/employees/${c.other.id}/photo`} />}
                <AvatarFallback>{initials(c.other.firstName, c.other.lastName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {c.other.firstName} {c.other.lastName}
                  </span>
                  {c.lastMessage && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.lastMessage.createdAt), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">
                    {c.lastMessage
                      ? (c.lastMessage.body ?? c.lastMessage.attachmentName ?? "Attachment")
                      : "No messages yet"}
                  </span>
                  {c.unreadCount > 0 && (
                    <Badge className="h-4 min-w-4 shrink-0 justify-center rounded-full px-1 text-[10px]">
                      {c.unreadCount > 9 ? "9+" : c.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
