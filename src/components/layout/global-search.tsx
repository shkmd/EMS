"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { NAV_GROUPS } from "@/components/layout/nav-items"
import type { Role } from "@prisma/client"

export function GlobalSearch({ role }: { role: Role }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      {/* Icon-only below sm — the full pill with visible "Search..." text
          doesn't fit next to the breadcrumb and topbar icons on a phone
          width, and was forcing the whole header (and page) to scroll
          horizontally. */}
      <Button
        variant="outline"
        size="icon"
        className="shrink-0 rounded-full border-transparent bg-muted text-muted-foreground hover:bg-muted sm:hidden"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="sr-only">Search</span>
      </Button>
      <Button
        variant="outline"
        className="hidden shrink-0 justify-start gap-2 rounded-full border-transparent bg-muted text-muted-foreground hover:bg-muted sm:flex sm:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        Search...
        <kbd className="ml-auto hidden rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Jump to a page">
        <CommandInput placeholder="Search pages..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((item) => !item.comingSoon && (!item.roles || item.roles.includes(role)))
            if (items.length === 0) return null
            return (
              <CommandGroup key={group.label} heading={group.label}>
                {items.map((item) => (
                  <CommandItem key={item.href} value={item.label} onSelect={() => navigate(item.href)}>
                    <item.icon />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          })}
        </CommandList>
      </CommandDialog>
    </>
  )
}
