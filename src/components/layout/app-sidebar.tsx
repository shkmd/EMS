"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2 } from "lucide-react"

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
      <SidebarRail />
    </Sidebar>
  )
}
