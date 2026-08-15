"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Plus, Search, FileSpreadsheet, FileText, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"

import { apiFetch } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getEmployeeColumns, type EmployeeRow } from "@/features/employees/components/employee-columns"
import { DeleteEmployeeDialog } from "@/features/employees/components/delete-employee-dialog"
import { GenerateOfferLetterDialog } from "@/features/hr-documents/components/generate-offer-letter-dialog"
import type { PaginationMeta } from "@/types/api"

const ALL = "__all__"

type EmployeesTableProps = {
  items: EmployeeRow[]
  pagination: PaginationMeta
  departments: { id: string; name: string }[]
  canManage: boolean
  query: {
    search: string
    departmentId: string
    status: string
    sortBy: string
    sortOrder: string
  }
}

export function EmployeesTable({ items, pagination, departments, canManage, query }: EmployeesTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState(query.search)
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeRow | null>(null)

  const updateParams = useCallback(
    (updates: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "" || value === ALL) {
          params.delete(key)
        } else {
          params.set(key, String(value))
        }
      }
      if (!("page" in updates)) params.delete("page")
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams]
  )

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== query.search) updateParams({ search: searchInput })
    }, 350)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  function handleSort(key: string) {
    const nextOrder = query.sortBy === key && query.sortOrder === "asc" ? "desc" : "asc"
    updateParams({ sortBy: key, sortOrder: nextOrder })
  }

  async function handleStatusChange(employee: EmployeeRow, status: string) {
    const result = await apiFetch(`/api/employees/${employee.id}/status`, { method: "PATCH", body: { status } })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    toast.success(status === "ACTIVE" ? "Employee activated" : "Employee deactivated")
    router.refresh()
  }

  const columns = useMemo(
    () =>
      getEmployeeColumns({
        canManage,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        onSort: handleSort,
        onDelete: setEmployeeToDelete,
        onStatusChange: handleStatusChange,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage, query.sortBy, query.sortOrder]
  )

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  })

  function exportUrl(format: "xlsx" | "pdf") {
    const params = new URLSearchParams(searchParams.toString())
    params.set("format", format)
    params.delete("page")
    params.delete("pageSize")
    return `/api/employees/export?${params.toString()}`
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={query.departmentId || ALL} onValueChange={(v) => updateParams({ departmentId: v })}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={query.status || ALL} onValueChange={(v) => updateParams({ status: v })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="ON_LEAVE">On leave</SelectItem>
            <SelectItem value="TERMINATED">Terminated</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={exportUrl("xlsx")}>
                  <FileSpreadsheet /> Export Excel
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={exportUrl("pdf")}>
                  <FileText /> Export PDF
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canManage && <GenerateOfferLetterDialog departments={departments} />}
          {canManage && (
            <Button asChild>
              <Link href="/employees/new">
                <Plus /> Add Employee
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {pagination.page} of {pagination.totalPages} — {pagination.total} employees
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => updateParams({ page: pagination.page - 1 })}
          >
            <ChevronLeft /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => updateParams({ page: pagination.page + 1 })}
          >
            Next <ChevronRight />
          </Button>
        </div>
      </div>

      <DeleteEmployeeDialog
        employee={employeeToDelete}
        onOpenChange={(open) => !open && setEmployeeToDelete(null)}
      />
    </div>
  )
}
