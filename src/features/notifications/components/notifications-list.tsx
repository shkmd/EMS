"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { BellOff, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { apiFetch } from "@/lib/api-client"
import type { PaginationMeta } from "@/types/api"

type NotificationItem = {
  id: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

const PAGE_SIZE = 20

export function NotificationsList() {
  const router = useRouter()
  const [items, setItems] = useState<NotificationItem[] | null>(null)
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)

  async function load() {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (unreadOnly) params.set("unreadOnly", "true")

    const result = await apiFetch<{ items: NotificationItem[]; pagination: PaginationMeta }>(`/api/notifications/list?${params}`)
    if (result.success) {
      setItems(result.data.items)
      setPagination(result.data.pagination)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, unreadOnly])

  async function handleSelect(notification: NotificationItem) {
    if (!notification.isRead) {
      await apiFetch(`/api/notifications/${notification.id}/read`, { method: "POST" })
      setItems((prev) => prev?.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)) ?? null)
    }
    if (notification.link) router.push(notification.link)
  }

  async function handleMarkAllRead() {
    await apiFetch("/api/notifications/read-all", { method: "POST" })
    toast.success("All notifications marked as read")
    load()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={unreadOnly}
            onCheckedChange={(checked) => {
              setUnreadOnly(checked)
              setPage(1)
            }}
          />
          Unread only
        </label>
        <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
          <CheckCheck /> Mark all read
        </Button>
      </div>

      {!items ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <BellOff className="size-6 opacity-50" />
            {unreadOnly ? "No unread notifications." : "You have no notifications yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => handleSelect(n)}
              className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                n.isRead ? "" : "bg-accent/40"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                <span className="font-medium">{n.title}</span>
              </div>
              <span className="text-sm text-muted-foreground">{n.message}</span>
              <span className="text-xs text-muted-foreground/70">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </span>
            </button>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
