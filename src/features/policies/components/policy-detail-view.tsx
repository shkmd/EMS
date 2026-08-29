"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, Loader2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch } from "@/lib/api-client"
import { initials } from "@/features/messaging/lib/initials"

type Policy = {
  id: string
  title: string
  category: string | null
  content: string | null
  version: string | null
  effectiveDate: string | null
  isPublished: boolean
  requiresAcknowledgment: boolean
}

type AcknowledgmentRow = {
  id: string
  acknowledgedAt: string
  employee: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null }
}

export function PolicyDetailView({
  policy,
  hasAcknowledged: initialAcknowledged,
  canManage,
  acknowledgments,
}: {
  policy: Policy
  hasAcknowledged: boolean
  canManage: boolean
  acknowledgments: AcknowledgmentRow[] | null
}) {
  const [hasAcknowledged, setHasAcknowledged] = useState(initialAcknowledged)
  const [isAcknowledging, setIsAcknowledging] = useState(false)

  async function handleAcknowledge() {
    setIsAcknowledging(true)
    try {
      const result = await apiFetch(`/api/policies/${policy.id}/acknowledge`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      setHasAcknowledged(true)
      toast.success("Acknowledged")
    } finally {
      setIsAcknowledging(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{policy.title}</CardTitle>
            {!policy.isPublished && <Badge variant="outline">Draft</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {policy.category ?? "General"}
            {policy.version && ` · ${policy.version}`}
            {policy.effectiveDate && ` · Effective ${new Date(policy.effectiveDate).toLocaleDateString()}`}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {policy.content && <p className="whitespace-pre-wrap text-sm leading-relaxed">{policy.content}</p>}

          {policy.requiresAcknowledgment &&
            (hasAcknowledged ? (
              <span className="flex w-fit items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-4" /> You&apos;ve acknowledged this policy
              </span>
            ) : (
              <Button className="w-fit" onClick={handleAcknowledge} disabled={isAcknowledging}>
                {isAcknowledging && <Loader2 className="animate-spin" />}
                I&apos;ve read and understood this
              </Button>
            ))}
        </CardContent>
      </Card>

      {canManage && acknowledgments && (
        <Card>
          <CardHeader>
            <CardTitle>Acknowledged by ({acknowledgments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {acknowledgments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one has acknowledged this yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {acknowledgments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        {a.employee.profilePhotoUrl && <AvatarImage src={`/api/employees/${a.employee.id}/photo`} />}
                        <AvatarFallback className="text-xs">{initials(`${a.employee.firstName} ${a.employee.lastName}`)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {a.employee.firstName} {a.employee.lastName}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(a.acknowledgedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
