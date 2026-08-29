"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AlertTriangle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { apiFetch } from "@/lib/api-client"
import { caseFileSchema, type CaseFileInput } from "@/features/posh/schemas"

export function FileCaseForm({ onFiled }: { onFiled: (caseNumber: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CaseFileInput>({
    resolver: zodResolver(caseFileSchema),
    defaultValues: { respondentName: "", description: "" },
  })

  async function onSubmit(values: CaseFileInput) {
    setIsSubmitting(true)
    try {
      const result = await apiFetch<{ case: { id: string; caseNumber: string } }>("/api/posh/cases", { method: "POST", body: values })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(`Report filed as ${result.data.case.caseNumber}`)
      form.reset({ respondentName: "", description: "" })
      onFiled(result.data.case.caseNumber)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>File a report</CardTitle>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Your report is only visible to the Internal Committee members assigned to review it — not to your manager or HR by default.
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="respondentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Respondent name</FormLabel>
                  <FormControl>
                    <Input placeholder="Who is this report about?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="incidentDate"
              render={({ field }) => (
                <FormItem className="w-48">
                  <FormLabel>Incident date (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What happened?</FormLabel>
                  <FormControl>
                    <Textarea rows={8} placeholder="Describe the incident in as much detail as you're comfortable with…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting} className="w-fit">
              {isSubmitting && <Loader2 className="animate-spin" />}
              Submit report
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
