"use client"

import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

type AssignedCase = {
  id: string
  caseNumber: string
  status: string
  respondentName: string
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  INQUIRY_IN_PROGRESS: "Inquiry In Progress",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
}

export function MyAssignedCasesList({ cases }: { cases: AssignedCase[] }) {
  const router = useRouter()

  if (cases.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No cases assigned to you.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {cases.map((c) => (
        <Card key={c.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => router.push(`/posh/cases/${c.id}`)}>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">{c.caseNumber}</p>
              <p className="text-xs text-muted-foreground">Re: {c.respondentName} · Filed {new Date(c.createdAt).toLocaleDateString()}</p>
            </div>
            <Badge variant="outline">{STATUS_LABELS[c.status] ?? c.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
