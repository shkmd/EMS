"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { CheckCircle2, CircleDashed } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"

type OnboardingRow = {
  id: string
  createdAt: string
  documentsCollected: boolean
  orientationComplete: boolean
  assetsAssigned: number
  portalAccessGranted: boolean
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeCode: string
    profilePhotoUrl: string | null
    dateOfJoining: string
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

export function OnboardingListClient() {
  const [rows, setRows] = useState<OnboardingRow[] | null>(null)

  useEffect(() => {
    apiFetch<{ onboardings: OnboardingRow[] }>("/api/onboarding").then((result) => {
      if (result.success) setRows(result.data.onboardings)
    })
  }, [])

  if (!rows) return <Skeleton className="h-64 w-full" />

  return (
    <Card>
      <CardContent className="pt-6">
        {rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No one is currently onboarding.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>Portal Access</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Orientation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/employees/${r.employee.id}?tab=onboarding`} className="flex items-center gap-2 hover:underline">
                        <Avatar className="size-7">
                          {r.employee.profilePhotoUrl && <AvatarImage src={`/api/employees/${r.employee.id}/photo`} />}
                          <AvatarFallback className="text-xs">{initials(r.employee.firstName, r.employee.lastName)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {r.employee.firstName} {r.employee.lastName}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>{format(new Date(r.employee.dateOfJoining), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      {r.assetsAssigned === 0 ? (
                        <Badge variant="outline">None</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{r.assetsAssigned} assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <MiniCheck done={r.portalAccessGranted} />
                    </TableCell>
                    <TableCell>
                      <MiniCheck done={r.documentsCollected} />
                    </TableCell>
                    <TableCell>
                      <MiniCheck done={r.orientationComplete} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
