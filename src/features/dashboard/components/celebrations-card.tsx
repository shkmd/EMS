import { Cake, PartyPopper } from "lucide-react"
import { format } from "date-fns"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Birthday = { id: string; firstName: string; lastName: string; day: number; profilePhotoUrl: string | null }
type Anniversary = Birthday & { years: number }

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

function EmptyList({ icon: Icon, message }: { icon: typeof Cake; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
      <Icon className="size-8 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

export function CelebrationsCard({
  birthdays,
  anniversaries,
}: {
  birthdays: Birthday[]
  anniversaries: Anniversary[]
}) {
  const monthLabel = format(new Date(), "MMMM")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Celebrations</CardTitle>
        <CardDescription>Birthdays and work anniversaries in {monthLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="birthdays">
          <TabsList className="w-full">
            <TabsTrigger value="birthdays">Birthdays</TabsTrigger>
            <TabsTrigger value="anniversaries">Work Anniversaries</TabsTrigger>
          </TabsList>
          <TabsContent value="birthdays" className="mt-3">
            {birthdays.length === 0 ? (
              <EmptyList icon={Cake} message="No birthdays this month" />
            ) : (
              <ul className="flex flex-col gap-3">
                {birthdays.map((b) => (
                  <li key={b.id} className="flex items-center gap-3">
                    <Avatar className="size-8">
                      {b.profilePhotoUrl && <AvatarImage src={b.profilePhotoUrl} />}
                      <AvatarFallback className="text-xs">{initials(b.firstName, b.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm">
                      {b.firstName} {b.lastName}
                    </span>
                    <Badge variant="secondary">{monthLabel} {b.day}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="anniversaries" className="mt-3">
            {anniversaries.length === 0 ? (
              <EmptyList icon={PartyPopper} message="No work anniversaries this month" />
            ) : (
              <ul className="flex flex-col gap-3">
                {anniversaries.map((a) => (
                  <li key={a.id} className="flex items-center gap-3">
                    <Avatar className="size-8">
                      {a.profilePhotoUrl && <AvatarImage src={a.profilePhotoUrl} />}
                      <AvatarFallback className="text-xs">{initials(a.firstName, a.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm">
                      {a.firstName} {a.lastName}
                    </span>
                    <Badge variant="secondary">{a.years} yr{a.years === 1 ? "" : "s"}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
