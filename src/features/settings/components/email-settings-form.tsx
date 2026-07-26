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
import { emailSettingsSchema, type EmailSettingsInput } from "@/features/settings/schemas"

type SettingsResponse = {
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpSecure: boolean
  fromName: string | null
  fromEmail: string | null
  hasPassword: boolean
}

export function EmailSettingsForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)

  const form = useForm<EmailSettingsInput>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      smtpHost: "",
      smtpPort: "",
      smtpUser: "",
      smtpPassword: "",
      smtpSecure: true,
      fromName: "",
      fromEmail: "",
    },
  })

  useEffect(() => {
    apiFetch<{ settings: SettingsResponse }>("/api/settings/email").then((result) => {
      if (result.success) {
        const s = result.data.settings
        form.reset({
          smtpHost: s.smtpHost ?? "",
          smtpPort: s.smtpPort ? String(s.smtpPort) : "",
          smtpUser: s.smtpUser ?? "",
          smtpPassword: "",
          smtpSecure: s.smtpSecure,
          fromName: s.fromName ?? "",
          fromEmail: s.fromEmail ?? "",
        })
        setHasPassword(s.hasPassword)
      }
      setIsLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: EmailSettingsInput) {
    setIsSubmitting(true)
    try {
      const result = await apiFetch("/api/settings/email", { method: "PUT", body: values })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Email settings updated")
      if (values.smtpPassword) {
        setHasPassword(true)
        form.setValue("smtpPassword", "")
      }
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
        <CardTitle>Email (SMTP)</CardTitle>
        <CardDescription>
          Used for password-reset emails. Leave blank to keep using the server&apos;s environment configuration.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="smtpHost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMTP host</FormLabel>
                    <FormControl>
                      <Input placeholder="smtp.example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtpPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMTP port</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="587" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="smtpUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMTP username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtpPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMTP password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={hasPassword ? "•••••••• (unchanged)" : ""} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fromEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="smtpSecure"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Use TLS</FormLabel>
                    <p className="text-xs text-muted-foreground">Enable for port 465; most other ports use STARTTLS.</p>
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
