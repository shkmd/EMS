"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api-client"
import { CreateUserDialog } from "@/features/users/components/create-user-dialog"

type UserRow = {
  id: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  employee: { id: string; firstName: string; lastName: string; employeeCode: string } | null
}

export function UsersTable({ viewerId }: { viewerId: string }) {
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function load() {
    const result = await apiFetch<{ users: UserRow[] }>("/api/users")
    if (result.success) setUsers(result.data.users)
  }

  useEffect(() => {
    load()
  }, [])

  async function updateUser(id: string, body: { role?: string; isActive?: boolean }) {
    setPendingId(id)
    try {
      const result = await apiFetch(`/api/users/${id}`, { method: "PATCH", body })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("User updated")
      load()
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Users</CardTitle>
          <CardDescription>Every login account, its role, and whether it&apos;s enabled.</CardDescription>
        </div>
        <CreateUserDialog onCreated={load} />
      </CardHeader>
      <CardContent>
        {!users ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Linked Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-32">Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No users yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => {
                    const isSelf = u.id === viewerId
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.email}
                          {isSelf && (
                            <Badge variant="outline" className="ml-2">
                              You
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.employee ? `${u.employee.firstName} ${u.employee.lastName} (${u.employee.employeeCode})` : "—"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(role) => updateUser(u.id, { role })}
                            disabled={isSelf || pendingId === u.id}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EMPLOYEE">Employee</SelectItem>
                              <SelectItem value="MANAGER">Manager</SelectItem>
                              <SelectItem value="HR">HR</SelectItem>
                              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.lastLoginAt ? formatDistanceToNow(new Date(u.lastLoginAt), { addSuffix: true }) : "Never"}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={u.isActive}
                            onCheckedChange={(checked) => updateUser(u.id, { isActive: checked })}
                            disabled={isSelf || pendingId === u.id}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
