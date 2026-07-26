"use client"

import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Eye, Pencil, Trash2, UserCheck, UserX } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type EmployeeRow = {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  mobile: string
  profilePhotoUrl: string | null
  employmentType: string
  status: string
  dateOfJoining: Date | string
  department: { id: string; name: string } | null
  designation: { id: string; title: string } | null
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  ON_LEAVE: "secondary",
  INACTIVE: "outline",
  TERMINATED: "destructive",
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

function SortableHeader({ label, sortKey, currentSortBy, currentSortOrder, onSort }: {
  label: string
  sortKey: string
  currentSortBy: string
  currentSortOrder: string
  onSort: (key: string) => void
}) {
  return (
    <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => onSort(sortKey)}>
      {label}
      <ArrowUpDown className={currentSortBy === sortKey ? "opacity-100" : "opacity-40"} />
      <span className="sr-only">{currentSortBy === sortKey ? currentSortOrder : ""}</span>
    </Button>
  )
}

export function getEmployeeColumns({
  canManage,
  sortBy,
  sortOrder,
  onSort,
  onDelete,
  onStatusChange,
}: {
  canManage: boolean
  sortBy: string
  sortOrder: string
  onSort: (key: string) => void
  onDelete: (employee: EmployeeRow) => void
  onStatusChange: (employee: EmployeeRow, status: string) => void
}): ColumnDef<EmployeeRow>[] {
  const columns: ColumnDef<EmployeeRow>[] = [
    {
      accessorKey: "name",
      header: () => (
        <SortableHeader label="Name" sortKey="name" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={onSort} />
      ),
      cell: ({ row }) => {
        const e = row.original
        return (
          <Link href={`/employees/${e.id}`} className="flex items-center gap-3 hover:underline">
            <Avatar className="size-8">
              {e.profilePhotoUrl && <AvatarImage src={`/api/employees/${e.id}/photo`} />}
              <AvatarFallback className="text-xs">{initials(e.firstName, e.lastName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">
                {e.firstName} {e.lastName}
              </span>
              <span className="text-xs text-muted-foreground">{e.employeeCode}</span>
            </div>
          </Link>
        )
      },
    },
    {
      accessorKey: "department",
      header: () => (
        <SortableHeader
          label="Department"
          sortKey="department"
          currentSortBy={sortBy}
          currentSortOrder={sortOrder}
          onSort={onSort}
        />
      ),
      cell: ({ row }) => row.original.department?.name ?? "—",
    },
    {
      accessorKey: "designation",
      header: "Designation",
      cell: ({ row }) => row.original.designation?.title ?? "—",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status] ?? "outline"}>
          {row.original.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "dateOfJoining",
      header: () => (
        <SortableHeader
          label="Joined"
          sortKey="dateOfJoining"
          currentSortBy={sortBy}
          currentSortOrder={sortOrder}
          onSort={onSort}
        />
      ),
      cell: ({ row }) => new Date(row.original.dateOfJoining).toLocaleDateString(),
    },
  ]

  if (canManage) {
    columns.push({
      id: "actions",
      cell: ({ row }) => {
        const employee = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/employees/${employee.id}`}>
                  <Eye /> View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/employees/${employee.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </DropdownMenuItem>
              {employee.status === "ACTIVE" ? (
                <DropdownMenuItem onClick={() => onStatusChange(employee, "INACTIVE")}>
                  <UserX /> Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onStatusChange(employee, "ACTIVE")}>
                  <UserCheck /> Activate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(employee)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })
  }

  return columns
}
