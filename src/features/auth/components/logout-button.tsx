"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api-client"

export function LogoutButton() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await apiFetch("/api/auth/logout", { method: "POST" })
    } finally {
      router.push("/login")
      router.refresh()
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
      {isLoggingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
      Log out
    </Button>
  )
}
