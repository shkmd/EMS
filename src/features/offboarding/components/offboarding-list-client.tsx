"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format, differenceInCalendarDays } from "date-fns"
import { CheckCircle2, CircleDashed } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"

const REASON_LABELS: Record<string, string> = {
  RESIGNATION: "Resignation",
  TERMINATION: "Termination",
  RETIREMENT: "Retirement",
  END_OF_CONTRACT: "End of contract",
  OTHER: "Other",
}

type OffboardingRow = {
  id: string
  lastWorkingDay: string
  reason: string
  duesCleared: boolean
  handoverComplete: boolean
  outstandingAssets: number
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeCode: string
    profilePhotoUrl: string | null
    department: { name: string } | null
  }
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

function MiniCheck({ done }: { done: boolean }) {
  return done ? (
    <CheckCircle2 className="size-4 text-emerald-600" />
  ) : (
    <CircleDashed className="size-4 text-muted-foreground" />
  )
}

export function OffboardingListClient() {
  const [rows, setRows] = useState<OffboardingRow[] | null>(null)

  useEffect(() => {
    apiFetch<{ offboardings: OffboardingRow[] }>("/api/offboarding").then((result) => {
      if (result.success) setRows(result.data.offboardings)
    })
  }, [])

  if (!rows) return <Skeleton className="h-64 w-full" />

  return (
    <Card>
      <CardContent className="pt-6">
        {rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No one is currently offboarding.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Last Working Day</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>Dues</TableHead>
                  <TableHead>Handover</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const days = differenceInCalendarDays(new Date(r.lastWorkingDay), new Date())
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link href={`/employees/${r.employee.id}?tab=offboarding`} className="flex items-center gap-2 hover:underline">
                          <Avatar className="size-7">
                            {r.employee.profilePhotoUrl && <AvatarImage src={`/api/employees/${r.employee.id}/photo`} />}
                            <AvatarFallback className="text-xs">{initials(r.employee.firstName, r.employee.lastName)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {r.employee.firstName} {r.employee.lastName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>{REASON_LABELS[r.reason] ?? r.reason}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {format(new Date(r.lastWorkingDay), "dd MMM yyyy")}
                          {days >= 0 && days <= 7 && <Badge variant="destructive">{days === 0 ? "Today" : `${days}d`}</Badge>}
                          {days < 0 && <Badge variant="outline">Overdue</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.outstandingAssets === 0 ? (
                          <MiniCheck done />
                        ) : (
                          <span className="text-xs text-muted-foreground">{r.outstandingAssets} outstanding</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <MiniCheck done={r.duesCleared} />
                      </TableCell>
                      <TableCell>
                        <MiniCheck done={r.handoverComplete} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
