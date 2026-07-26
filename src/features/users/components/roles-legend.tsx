import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const ROLES = [
  {
    role: "SUPER_ADMIN",
    label: "Super Admin",
    description: "Full system access — every module, company-wide Settings, and user management.",
  },
  {
    role: "HR",
    label: "HR",
    description:
      "Manages employees, departments, designations, payroll, leave sign-off, assets, and announcements company-wide.",
  },
  {
    role: "MANAGER",
    label: "Manager",
    description: "Approves leave and views attendance for their direct reports; otherwise self-service only.",
  },
  {
    role: "EMPLOYEE",
    label: "Employee",
    description: "Self-service only — own attendance, leave requests, payslips, and profile.",
  },
]

export function RolesLegend() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles &amp; Responsibilities</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ROLES.map((r) => (
          <div key={r.role} className="flex flex-col gap-1 rounded-lg border p-3">
            <Badge className="w-fit">{r.label}</Badge>
            <p className="text-xs text-muted-foreground">{r.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
