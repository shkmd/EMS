"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { ChevronLeft, ChevronRight, Eye, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api-client"
import type { PaginationMeta } from "@/types/api"

const ALL = "__all__"
const PAGE_SIZE = 25

type AuditLogRow = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: { id: string; email: string; employee: { firstName: string; lastName: string } | null } | null
}

function actorName(user: AuditLogRow["user"]) {
  if (!user) return "System"
  return user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email
}

export function AuditLogTable() {
  const [entityType, setEntityType] = useState(ALL)
  const [action, setAction] = useState(ALL)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<AuditLogRow[] | null>(null)
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [filterOptions, setFilterOptions] = useState<{ entityTypes: string[]; actions: string[] }>({
    entityTypes: [],
    actions: [],
  })
  const [detailTarget, setDetailTarget] = useState<AuditLogRow | null>(null)

  useEffect(() => {
    apiFetch<{ entityTypes: string[]; actions: string[] }>("/api/audit-logs/filter-options").then((result) => {
      if (result.success) setFilterOptions(result.data)
    })
  }, [])

  async function load() {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (entityType !== ALL) params.set("entityType", entityType)
    if (action !== ALL) params.set("action", action)
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    if (search) params.set("search", search)

    const result = await apiFetch<{ items: AuditLogRow[]; pagination: PaginationMeta }>(`/api/audit-logs?${params}`)
    if (result.success) {
      setRows(result.data.items)
      setPagination(result.data.pagination)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, search ? 350 : 0)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, action, dateFrom, dateTo, search, page])

  function updateAndResetPage(fn: () => void) {
    fn()
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search entity ID or email..."
            value={search}
            onChange={(e) => updateAndResetPage(() => setSearch(e.target.value))}
            className="pl-8"
          />
        </div>
        <Select value={entityType} onValueChange={(v) => updateAndResetPage(() => setEntityType(v))}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All entity types</SelectItem>
            {filterOptions.entityTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={(v) => updateAndResetPage(() => setAction(v))}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All actions</SelectItem>
            {filterOptions.actions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={dateFrom} onChange={(e) => updateAndResetPage(() => setDateFrom(e.target.value))} className="w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={dateTo} onChange={(e) => updateAndResetPage(() => setDateTo(e.target.value))} className="w-36" />
        </div>
      </div>

      {!rows ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No audit log entries match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(r.createdAt), "dd MMM yyyy, HH:mm:ss")}
                    </TableCell>
                    <TableCell>{actorName(r.user)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.entityType}
                      {r.entityId && <span className="text-xs"> · {r.entityId.slice(0, 12)}…</span>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDetailTarget(r)}>
                        <Eye />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} — {pagination.total} entries
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

      <Dialog open={!!detailTarget} onOpenChange={(open) => !open && setDetailTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audit log entry</DialogTitle>
            <DialogDescription>
              {detailTarget && format(new Date(detailTarget.createdAt), "dd MMM yyyy, HH:mm:ss")}
            </DialogDescription>
          </DialogHeader>
          {detailTarget && (
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Actor:</span> {actorName(detailTarget.user)}
              </div>
              <div>
                <span className="text-muted-foreground">Action:</span> {detailTarget.action}
              </div>
              <div>
                <span className="text-muted-foreground">Entity:</span> {detailTarget.entityType}
                {detailTarget.entityId && ` (${detailTarget.entityId})`}
              </div>
              <div>
                <span className="text-muted-foreground">IP address:</span> {detailTarget.ipAddress ?? "—"}
              </div>
              <div>
                <span className="text-muted-foreground">User agent:</span>{" "}
                <span className="break-all">{detailTarget.userAgent ?? "—"}</span>
              </div>
              {detailTarget.metadata && (
                <div>
                  <span className="text-muted-foreground">Metadata:</span>
                  <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(detailTarget.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
