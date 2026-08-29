"use client"

import { useRouter } from "next/navigation"
import { CheckCircle2, FileText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

type CatalogPolicy = {
  id: string
  title: string
  category: string | null
  version: string | null
  requiresAcknowledgment: boolean
  hasAcknowledged: boolean
}

export function PolicyCatalog({ policies }: { policies: CatalogPolicy[] }) {
  const router = useRouter()

  if (policies.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No policies are published yet.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {policies.map((p) => (
        <Card key={p.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => router.push(`/policies/${p.id}`)}>
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <FileText className="size-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.category ?? "General"}
                  {p.version && ` · ${p.version}`}
                </p>
              </div>
            </div>
            {p.requiresAcknowledgment &&
              (p.hasAcknowledged ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-500">
                  <CheckCircle2 className="size-3.5" /> Acknowledged
                </span>
              ) : (
                <Badge variant="outline">Acknowledgment needed</Badge>
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
