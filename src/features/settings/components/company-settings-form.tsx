"use client"

import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { apiFetch } from "@/lib/api-client"
import {
  companySettingsSchema,
  FONT_FAMILY_VALUES,
  FONT_FAMILY_LABELS,
  type CompanySettingsInput,
} from "@/features/settings/schemas"

export function CompanySettingsForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasLogo, setHasLogo] = useState(false)
  const [logoVersion, setLogoVersion] = useState(0)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<CompanySettingsInput>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      companyName: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      timezone: "UTC",
      currency: "USD",
      dateFormat: "dd MMM yyyy",
      primaryColor: "",
      fontFamily: "inter",
    },
  })

  useEffect(() => {
    apiFetch<{ settings: CompanySettingsInput & { logoUrl: string | null } }>("/api/settings/company").then((result) => {
      if (result.success) {
        form.reset({
          companyName: result.data.settings.companyName,
          address: result.data.settings.address ?? "",
          phone: result.data.settings.phone ?? "",
          email: result.data.settings.email ?? "",
          website: result.data.settings.website ?? "",
          timezone: result.data.settings.timezone,
          currency: result.data.settings.currency,
          dateFormat: result.data.settings.dateFormat,
          primaryColor: result.data.settings.primaryColor ?? "",
          fontFamily: result.data.settings.fontFamily ?? "inter",
        })
        setHasLogo(!!result.data.settings.logoUrl)
      }
      setIsLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: CompanySettingsInput) {
    setIsSubmitting(true)
    try {
      const result = await apiFetch("/api/settings/company", { method: "PUT", body: values })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Company settings updated. Refresh to see the new theme.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onLogoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/settings/logo", { method: "POST", body: formData, credentials: "include" })
      const result = await res.json()
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Logo updated. Refresh to see it everywhere.")
      setHasLogo(true)
      setLogoVersion((v) => v + 1)
    } finally {
      setIsUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Information</CardTitle>
        <CardDescription>Shown on payslips and used as the default for reports.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {hasLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/settings/logo?v=${logoVersion}`} alt="Company logo" className="size-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">No logo</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onLogoSelected}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingLogo ? <Loader2 className="animate-spin" /> : <Upload />}
                  Upload logo
                </Button>
                <p className="text-xs text-muted-foreground">JPEG, PNG or WebP.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={field.value && /^#[0-9a-fA-F]{6}$/.test(field.value) ? field.value : "#6366f1"}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="size-9 shrink-0 cursor-pointer rounded border bg-transparent p-1"
                        />
                        <Input placeholder="#6366f1" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fontFamily"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Font family</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FONT_FAMILY_VALUES.map((f) => (
                          <SelectItem key={f} value={f}>
                            {FONT_FAMILY_LABELS[f]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
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
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Asia/Kolkata" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. INR" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date format</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. dd MMM yyyy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
