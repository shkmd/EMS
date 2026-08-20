import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export type LeaveBalanceItem = {
  leaveTypeId: string
  name: string
  code: string
  isPaid: boolean
  allocated: number
  used: number
  remaining: number
}

export function LeaveBalanceCards({ balances }: { balances: LeaveBalanceItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {balances.map((b) => (
        <Card key={b.leaveTypeId}>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm font-medium">{b.name}</p>
            <p className="text-2xl font-semibold tabular-nums">
              {b.remaining}
              <span className="text-sm font-normal text-muted-foreground"> / {b.allocated} remaining</span>
            </p>
            {b.isPaid ? (
              <>
                <Progress value={b.allocated > 0 ? (b.used / b.allocated) * 100 : 0} />
                <p className="text-xs text-muted-foreground">{b.used} used</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Unpaid</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
