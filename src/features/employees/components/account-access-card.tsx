"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { KeyRound, Loader2, ShieldCheck, ShieldOff } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/api-client"

const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "MANAGER", label: "Manager" },
  { value: "HR", label: "HR" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
] as const

type AccountUser = { id: string; email: string; role: string; isActive: boolean } | null

export function AccountAccessCard({
  employeeId,
  user,
  viewerCanGrantSuperAdmin,
}: {
  employeeId: string
  user: AccountUser
  viewerCanGrantSuperAdmin: boolean
}) {
  const router = useRouter()
  const [role, setRole] = useState(user?.role ?? "EMPLOYEE")
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)

  const roleOptions = ROLE_OPTIONS.filter((r) => r.value !== "SUPER_ADMIN" || viewerCanGrantSuperAdmin || user?.role === "SUPER_ADMIN")

  async function grantOrUpdate() {
    setIsSaving(true)
    try {
      const result = await apiFetch(`/api/employees/${employeeId}/account-access`, {
        method: "PUT",
        body: { enabled: true, role },
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(user ? "Role updated" : "Portal access granted — credentials emailed")
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleActive(nextActive: boolean) {
    setIsSaving(true)
    try {
      const result = await apiFetch(`/api/employees/${employeeId}/account-access`, {
        method: "PUT",
        body: nextActive ? { enabled: true, role } : { enabled: false },
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(nextActive ? "Access reactivated" : "Access revoked")
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  async function sendResetEmail() {
    setIsSendingReset(true)
    try {
      const result = await apiFetch(`/api/employees/${employeeId}/account-access/reset-password`, { method: "POST" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Password reset email sent")
    } finally {
      setIsSendingReset(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Portal Access
            {user ? (
              <Badge variant={user.isActive ? "default" : "outline"}>{user.isActive ? "Active" : "Deactivated"}</Badge>
            ) : (
              <Badge variant="outline">No access</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {user ? `Logs in as ${user.email}.` : "This employee can't log in to EMS yet."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={grantOrUpdate} disabled={isSaving || (!!user && role === user.role)}>
          {isSaving && <Loader2 className="animate-spin" />}
          {user ? "Save role" : "Grant access"}
        </Button>

        {user && (
          <>
            <Button
              variant="outline"
              onClick={() => toggleActive(!user.isActive)}
              disabled={isSaving}
            >
              {user.isActive ? <ShieldOff /> : <ShieldCheck />}
              {user.isActive ? "Deactivate" : "Reactivate"}
            </Button>
            <Button variant="outline" onClick={sendResetEmail} disabled={isSendingReset}>
              {isSendingReset ? <Loader2 className="animate-spin" /> : <KeyRound />}
              Send password reset
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
