"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Bell, BellOff, CheckCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiFetch } from "@/lib/api-client"

type NotificationItem = {
  id: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

export function NotificationsMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  async function load() {
    const result = await apiFetch<{ items: NotificationItem[]; unreadCount: number }>("/api/notifications")
    if (result.success) {
      setItems(result.data.items)
      setUnreadCount(result.data.unreadCount)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  async function handleSelect(notification: NotificationItem) {
    if (!notification.isRead) {
      await apiFetch(`/api/notifications/${notification.id}/read`, { method: "POST" })
      setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    setOpen(false)
    if (notification.link) router.push(notification.link)
  }

  async function handleMarkAllRead() {
    await apiFetch("/api/notifications/read-all", { method: "POST" })
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative">
          <Bell />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleMarkAllRead}>
              <CheckCheck /> Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-2 py-6 text-center text-sm text-muted-foreground">
            <BellOff className="size-6 opacity-50" />
            You&apos;re all caught up.
          </div>
        ) : (
          <div className="flex max-h-80 flex-col overflow-y-auto">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleSelect(n)}
                className={`flex flex-col gap-0.5 rounded-md px-2 py-2 text-left text-sm hover:bg-accent ${
                  n.isRead ? "" : "bg-accent/50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  <span className="font-medium">{n.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">{n.message}</span>
                <span className="text-[11px] text-muted-foreground/70">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </span>
              </button>
            ))}
          </div>
        )}
        <DropdownMenuSeparator />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-xs"
          onClick={() => {
            setOpen(false)
            router.push("/notifications")
          }}
        >
          View all notifications
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
