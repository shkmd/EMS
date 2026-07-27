"use client"

import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { ArrowLeft, Download, Loader2, Paperclip, Send, X } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { initials } from "@/features/messaging/lib/initials"
import type { ParticipantRef, MessageItem } from "@/features/messaging/lib/types"

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

function AttachmentPreview({ message }: { message: MessageItem }) {
  if (!message.attachmentUrl || !message.attachmentName) return null
  const isImage = message.attachmentType && IMAGE_TYPES.includes(message.attachmentType)
  const href = `/api/messages/attachments/${message.id}`

  if (isImage) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={href} alt={message.attachmentName} className="max-h-48 max-w-xs rounded-md border object-cover" />
      </a>
    )
  }

  return (
    <a
      href={href}
      download
      className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent/50"
    >
      <Download className="size-4 shrink-0" />
      <span className="truncate">{message.attachmentName}</span>
    </a>
  )
}

export function MessageThread({
  other,
  messages,
  currentUserId,
  isLoading,
  onSend,
  onBack,
}: {
  other: ParticipantRef | null
  messages: MessageItem[]
  currentUserId: string
  isLoading: boolean
  onSend: (body: string, file: File | null) => Promise<void>
  onBack: () => void
}) {
  const [text, setText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isSending, setIsSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length])

  async function handleSend() {
    const body = text.trim()
    if (!body && !file) return
    setIsSending(true)
    try {
      await onSend(body, file)
      setText("")
      setFile(null)
    } catch {
      toast.error("Failed to send message. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!other) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a conversation, or start a new one.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <Avatar className="size-8">
          {other.employeeId && <AvatarImage src={`/api/employees/${other.employeeId}/photo`} />}
          <AvatarFallback className="text-xs">{initials(other.name)}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{other.name}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const isOwn = m.senderId === currentUserId
              return (
                <div key={m.id} className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
                  <div className={cn("flex max-w-[75%] flex-col gap-1", isOwn && "items-end")}>
                    {m.body && (
                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 text-sm",
                          isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                      >
                        {m.body}
                      </div>
                    )}
                    {m.attachmentUrl && <AttachmentPreview message={m} />}
                    <span className="px-1 text-[11px] text-muted-foreground">{format(new Date(m.createdAt), "p")}</span>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t p-3">
        {file && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1 text-xs">
            <Paperclip className="size-3.5 shrink-0" />
            <span className="truncate">{file.name}</span>
            <Button variant="ghost" size="icon-sm" className="ml-auto size-5" onClick={() => setFile(null)}>
              <X className="size-3" />
            </Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
            <Paperclip />
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="max-h-32 min-h-9 flex-1 resize-none py-2"
            disabled={isSending}
          />
          <Button onClick={handleSend} disabled={isSending || (!text.trim() && !file)}>
            {isSending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </div>
    </div>
  )
}
