import Link from "next/link"
import { format, differenceInCalendarDays } from "date-fns"
import { BellRing } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Renewal = { id: string; name: string; endDate: Date }

export function UpcomingRenewalsCard({ renewals }: { renewals: Renewal[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Renewals</CardTitle>
        <CardDescription>Subscriptions renewing in the next 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {renewals.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <BellRing className="size-8 opacity-50" />
            <p className="text-sm">Nothing renewing soon</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {renewals.map((r) => {
              const days = differenceInCalendarDays(r.endDate, new Date())
              return (
                <li key={r.id} className="flex items-center gap-3">
                  <span className="flex-1 truncate text-sm">{r.name}</span>
                  <span className="text-xs text-muted-foreground">{format(r.endDate, "dd MMM yyyy")}</span>
                  <Badge variant={days <= 7 ? "destructive" : "secondary"}>
                    {days <= 0 ? "Today" : `${days}d`}
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}
        <Link href="/subscriptions" className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground">
          View all subscriptions
        </Link>
      </CardContent>
    </Card>
  )
}
