"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { apiFetch } from "@/lib/api-client"
import { systemSettingsSchema, type SystemSettingsInput } from "@/features/settings/schemas"

type SettingsResponse = {
  sessionTimeoutMinutes: number
  passwordMinLength: number
  maxLoginAttempts: number
  lockoutDurationMinutes: number
  maintenanceMode: boolean
}

export function SystemSettingsForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SystemSettingsInput>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
      sessionTimeoutMinutes: "60",
      passwordMinLength: "8",
      maxLoginAttempts: "5",
      lockoutDurationMinutes: "15",
      maintenanceMode: false,
    },
  })

  useEffect(() => {
    apiFetch<{ settings: SettingsResponse }>("/api/settings/system").then((result) => {
      if (result.success) {
        const s = result.data.settings
        form.reset({
          sessionTimeoutMinutes: String(s.sessionTimeoutMinutes),
          passwordMinLength: String(s.passwordMinLength),
          maxLoginAttempts: String(s.maxLoginAttempts),
          lockoutDurationMinutes: String(s.lockoutDurationMinutes),
          maintenanceMode: s.maintenanceMode,
        })
      }
      setIsLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: SystemSettingsInput) {
    setIsSubmitting(true)
    try {
      const result = await apiFetch("/api/settings/system", { method: "PUT", body: values })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("System settings updated")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System</CardTitle>
        <CardDescription>
          Maintenance mode takes effect immediately. The other fields are recorded for administrative reference —
          see the README for what&apos;s currently enforced at runtime.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sessionTimeoutMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session timeout (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="passwordMinLength"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum password length</FormLabel>
                    <FormControl>
                      <Input type="number" min={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxLoginAttempts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max login attempts</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lockoutDurationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lockout duration (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="maintenanceMode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Maintenance mode</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Blocks everyone except Super Admins from the dashboard.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}
