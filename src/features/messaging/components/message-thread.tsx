"use client"

import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { ArrowLeft, Download, Loader2, Paperclip, Phone, Send, Users, Video, X } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { initials } from "@/features/messaging/lib/initials"
import { useCall } from "@/features/messaging/components/call-provider"
import type { ConversationDetail, MessageItem, ParticipantRef } from "@/features/messaging/lib/types"

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

/** Renders a message body with `@Full Name` substrings (matching an actual
 * participant) highlighted, so a mention reads visually distinct from
 * plain text that happens to contain an @. */
function MessageBody({ body, participants }: { body: string; participants: ParticipantRef[] }) {
  if (participants.length === 0) return <>{body}</>

  const names = [...new Set(participants.map((p) => p.name))].sort((a, b) => b.length - a.length)
  const pattern = new RegExp(`@(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g")

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(body))) {
    if (match.index > lastIndex) parts.push(body.slice(lastIndex, match.index))
    parts.push(
      <span key={match.index} className="font-medium text-primary">
        {match[0]}
      </span>
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < body.length) parts.push(body.slice(lastIndex))
  return <>{parts}</>
}

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
  conversation,
  messages,
  currentUserId,
  isLoading,
  onSend,
  onBack,
}: {
  conversation: ConversationDetail | null
  messages: MessageItem[]
  currentUserId: string
  isLoading: boolean
  onSend: (body: string, file: File | null) => Promise<void>
  onBack: () => void
}) {
  const { state: callState, startCall } = useCall()
  const [text, setText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isSending, setIsSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState(0)
  const [mentionIndex, setMentionIndex] = useState(0)

  const mentionCandidates =
    mentionQuery === null
      ? []
      : (conversation?.participants ?? []).filter((p) => p.name.toLowerCase().includes(mentionQuery.toLowerCase()))

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
      setMentionQuery(null)
    } catch {
      toast.error("Failed to send message. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    setText(value)

    const cursor = e.target.selectionStart
    const uptoCursor = value.slice(0, cursor)
    const atIndex = uptoCursor.lastIndexOf("@")
    const isMentionStart = atIndex !== -1 && (atIndex === 0 || /\s/.test(uptoCursor[atIndex - 1]!))
    const afterAt = isMentionStart ? uptoCursor.slice(atIndex + 1) : null

    if (afterAt !== null && !/\s/.test(afterAt)) {
      setMentionQuery(afterAt)
      setMentionStart(atIndex)
      setMentionIndex(0)
    } else {
      setMentionQuery(null)
    }
  }

  function selectMention(participant: ParticipantRef) {
    const cursor = textareaRef.current?.selectionStart ?? text.length
    const before = text.slice(0, mentionStart)
    const after = text.slice(cursor)
    const inserted = `@${participant.name} `
    const nextText = `${before}${inserted}${after}`
    setText(nextText)
    setMentionQuery(null)
    requestAnimationFrame(() => {
      const pos = before.length + inserted.length
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(pos, pos)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setMentionIndex((i) => (i + 1) % mentionCandidates.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setMentionIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        selectMention(mentionCandidates[mentionIndex]!)
        return
      }
      if (e.key === "Escape") {
        setMentionQuery(null)
        return
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a conversation, or start a new one.
      </div>
    )
  }

  const isGroup = conversation.isGroup
  const title = isGroup
    ? conversation.name || conversation.participants.map((p) => p.name).join(", ") || "Group"
    : (conversation.participants[0]?.name ?? "Unknown")
  const subtitle = isGroup ? conversation.participants.map((p) => p.name).join(", ") : null
  const senderById = new Map(conversation.participants.map((p) => [p.id, p]))

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <Avatar className="size-8">
          {isGroup ? (
            <AvatarFallback>
              <Users className="size-4" />
            </AvatarFallback>
          ) : (
            <>
              {conversation.participants[0]?.employeeId && (
                <AvatarImage src={`/api/employees/${conversation.participants[0].employeeId}/photo`} />
              )}
              <AvatarFallback className="text-xs">{initials(title)}</AvatarFallback>
            </>
          )}
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{title}</div>
          {subtitle && <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          disabled={callState.status !== "idle"}
          onClick={() => startCall(conversation.id, conversation.participants, false)}
          title="Voice call"
        >
          <Phone />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={callState.status !== "idle"}
          onClick={() => startCall(conversation.id, conversation.participants, true)}
          title="Video call"
        >
          <Video />
        </Button>
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
              const senderName = isGroup && !isOwn ? senderById.get(m.senderId)?.name : null
              return (
                <div key={m.id} className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
                  <div className={cn("flex max-w-[75%] flex-col gap-1", isOwn && "items-end")}>
                    {senderName && <span className="px-1 text-[11px] font-medium text-muted-foreground">{senderName}</span>}
                    {m.body && (
                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                          isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                      >
                        <MessageBody body={m.body} participants={conversation.participants} />
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

      <div className="relative flex flex-col gap-2 border-t p-3">
        {mentionQuery !== null && mentionCandidates.length > 0 && (
          <div className="absolute bottom-full left-3 mb-1 max-h-48 w-56 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {mentionCandidates.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectMention(p)
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                  i === mentionIndex && "bg-accent"
                )}
              >
                <Avatar className="size-6">
                  {p.employeeId && <AvatarImage src={`/api/employees/${p.employeeId}/photo`} />}
                  <AvatarFallback className="text-[10px]">{initials(p.name)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}
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
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (@ to mention)"
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
