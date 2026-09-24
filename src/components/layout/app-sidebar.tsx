"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, LifeBuoy } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NAV_GROUPS } from "@/components/layout/nav-items"
import { apiFetch } from "@/lib/api-client"
import type { Role } from "@prisma/client"

export function AppSidebar({
  role,
  companyName,
  hasLogo,
}: {
  role: Role
  companyName: string
  hasLogo: boolean
}) {
  const pathname = usePathname()
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    async function load() {
      const result = await apiFetch<{ count: number }>("/api/messages/unread-count")
      if (result.success) setUnreadMessages(result.data.count)
    }
    load()
    const interval = setInterval(load, 20_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/settings/logo" alt={companyName} className="size-7 shrink-0 rounded-lg object-contain" />
          ) : (
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </div>
          )}
          <span className="font-semibold group-data-[collapsible=icon]:hidden">{companyName}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => !item.roles || item.roles.includes(role))
          if (visibleItems.length === 0) return null

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                      <SidebarMenuItem key={item.href}>
                        {item.comingSoon ? (
                          <SidebarMenuButton disabled tooltip={`${item.label} — coming soon`}>
                            <item.icon />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.label}
                            className={
                              isActive
                                ? "data-active:bg-primary! data-active:text-primary-foreground! data-active:font-medium [&_svg]:text-primary-foreground!"
                                : undefined
                            }
                          >
                            <Link href={item.href}>
                              <item.icon />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        )}
                        {item.comingSoon && <SidebarMenuBadge>Soon</SidebarMenuBadge>}
                        {item.href === "/messages" && unreadMessages > 0 && (
                          <SidebarMenuBadge>{unreadMessages > 9 ? "9+" : unreadMessages}</SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <div className="mx-2 mb-2 flex flex-col items-center gap-2 rounded-2xl bg-primary p-4 text-center text-primary-foreground group-data-[collapsible=icon]:hidden">
        <div className="flex size-10 items-center justify-center rounded-full bg-white/15">
          <LifeBuoy className="size-5" />
        </div>
        <p className="text-sm font-bold">Need help?</p>
        <p className="text-xs leading-relaxed opacity-85">Reach the HR desk for payroll, leave or access issues.</p>
        <Link
          href="/messages"
          className="mt-1 inline-flex h-9 w-full items-center justify-center rounded-lg bg-white text-xs font-bold text-primary"
        >
          Contact Support
        </Link>
      </div>
      <SidebarRail />
    </Sidebar>
  )
}
