"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { apiFetch } from "@/lib/api-client"
import { ConversationList } from "@/features/messaging/components/conversation-list"
import { MessageThread } from "@/features/messaging/components/message-thread"
import { NewConversationDialog } from "@/features/messaging/components/new-conversation-dialog"
import type { ConversationSummary, EmployeeRef, MessageItem } from "@/features/messaging/lib/types"

export function MessagesApp({
  initialConversations,
  currentEmployeeId,
}: {
  initialConversations: ConversationSummary[]
  currentEmployeeId: string
}) {
  const [conversations, setConversations] = useState(initialConversations)
  const [activeId, setActiveId] = useState<string | null>(initialConversations[0]?.id ?? null)
  const [activeOther, setActiveOther] = useState<EmployeeRef | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mobileView, setMobileView] = useState<"list" | "thread">(initialConversations.length > 0 ? "thread" : "list")
  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId

  const refreshConversations = useCallback(async () => {
    const result = await apiFetch<{ conversations: ConversationSummary[] }>("/api/messages/conversations")
    if (result.success) setConversations(result.data.conversations)
  }, [])

  const openConversation = useCallback(async (id: string) => {
    setActiveId(id)
    setMobileView("thread")
    setIsLoadingMessages(true)
    const result = await apiFetch<{ conversation: { id: string; other: EmployeeRef }; messages: MessageItem[] }>(
      `/api/messages/conversations/${id}`
    )
    if (result.success) {
      setActiveOther(result.data.conversation.other)
      setMessages(result.data.messages)
      await apiFetch(`/api/messages/conversations/${id}/read`, { method: "POST" })
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)))
    } else {
      toast.error(result.error.message)
    }
    setIsLoadingMessages(false)
  }, [])

  useEffect(() => {
    if (activeId) openConversation(activeId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const source = new EventSource("/api/messages/stream")

    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        if (parsed?.type !== "message") return
        const incoming = parsed.message as MessageItem
        const conversationId = parsed.conversationId as string

        if (conversationId === activeIdRef.current) {
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]))
          apiFetch(`/api/messages/conversations/${conversationId}/read`, { method: "POST" })
        }

        setConversations((prev) => {
          const exists = prev.some((c) => c.id === conversationId)
          if (!exists) {
            refreshConversations()
            return prev
          }
          return prev
            .map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    lastMessage: {
                      body: incoming.body,
                      attachmentName: incoming.attachmentName,
                      senderId: incoming.senderId,
                      createdAt: incoming.createdAt,
                    },
                    unreadCount: conversationId === activeIdRef.current ? 0 : c.unreadCount + 1,
                    updatedAt: incoming.createdAt,
                  }
                : c
            )
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        })
      } catch {
        // ignore malformed events
      }
    }

    return () => source.close()
  }, [refreshConversations])

  async function handleSend(body: string, file: File | null) {
    if (!activeId) return
    const formData = new FormData()
    if (body) formData.append("body", body)
    if (file) formData.append("attachment", file)

    const res = await fetch(`/api/messages/conversations/${activeId}/messages`, {
      method: "POST",
      body: formData,
      credentials: "include",
    })
    const result = await res.json()
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    setMessages((prev) => [...prev, result.data.message])
    refreshConversations()
  }

  async function handleStartConversation(employeeId: string) {
    const result = await apiFetch<{ conversation: { id: string } }>("/api/messages/conversations", {
      method: "POST",
      body: { employeeId },
    })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    await refreshConversations()
    openConversation(result.data.conversation.id)
  }

  return (
    <div className="grid h-[calc(100vh-160px)] grid-cols-1 overflow-hidden rounded-lg border md:grid-cols-[300px_1fr]">
      <div className={mobileView === "list" ? "block md:border-r" : "hidden md:block md:border-r"}>
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={openConversation}
          onNewConversation={() => setDialogOpen(true)}
        />
      </div>
      <div className={mobileView === "thread" ? "block" : "hidden md:block"}>
        <MessageThread
          other={activeOther}
          messages={messages}
          currentEmployeeId={currentEmployeeId}
          isLoading={isLoadingMessages}
          onSend={handleSend}
          onBack={() => setMobileView("list")}
        />
      </div>
      <NewConversationDialog open={dialogOpen} onOpenChange={setDialogOpen} onSelect={handleStartConversation} />
    </div>
  )
}
