"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { createContext, Fragment, useCallback, useContext, useEffect, useState } from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

function toTitleCase(segment: string) {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

// Dynamic route segments (cuids) have no readable label on their own — a
// detail page registers a human label for its own id here (via
// SetBreadcrumbLabel below), and PageBreadcrumb swaps it in wherever that
// id appears in the current path. Keyed by the raw id, not by path, since
// ids are already globally unique.
type SetBreadcrumbLabelFn = (id: string, label: string | null) => void

const BreadcrumbLabelsContext = createContext<Record<string, string>>({})
const SetBreadcrumbLabelContext = createContext<SetBreadcrumbLabelFn>(() => {})

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>({})

  const setLabel = useCallback<SetBreadcrumbLabelFn>((id, label) => {
    setLabels((prev) => {
      if (label === null) {
        if (!(id in prev)) return prev
        const next = { ...prev }
        delete next[id]
        return next
      }
      if (prev[id] === label) return prev
      return { ...prev, [id]: label }
    })
  }, [])

  return (
    <SetBreadcrumbLabelContext.Provider value={setLabel}>
      <BreadcrumbLabelsContext.Provider value={labels}>{children}</BreadcrumbLabelsContext.Provider>
    </SetBreadcrumbLabelContext.Provider>
  )
}

/** Drop this (renders nothing) into a detail page to give its `id` segment
 * a readable breadcrumb label, e.g. <SetBreadcrumbLabel id={employee.id}
 * label={`${employee.firstName} ${employee.lastName}`} />. */
export function SetBreadcrumbLabel({ id, label }: { id: string; label: string }) {
  const setLabel = useContext(SetBreadcrumbLabelContext)
  useEffect(() => {
    setLabel(id, label)
    return () => setLabel(id, null)
  }, [id, label, setLabel])
  return null
}

export function PageBreadcrumb() {
  const pathname = usePathname()
  const labels = useContext(BreadcrumbLabelsContext)
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`
          const isLast = index === segments.length - 1
          const label = labels[segment] ?? toTitleCase(segment)
          return (
            <Fragment key={href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
