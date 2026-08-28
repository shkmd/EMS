"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"
import { RECOMMENDATION_LABEL } from "@/features/recruitment/lib/labels"
import { interviewFeedbackSchema, type InterviewFeedbackInput } from "@/features/recruitment/schemas"

export function InterviewFeedbackDialog({
  interviewId,
  candidateName,
  defaultValues,
  open,
  onOpenChange,
  onSaved,
}: {
  interviewId: string | null
  candidateName: string
  defaultValues?: Partial<InterviewFeedbackInput>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<InterviewFeedbackInput>({
    resolver: zodResolver(interviewFeedbackSchema),
    defaultValues: { rating: "3", recommendation: "YES", comments: "" },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        rating: defaultValues?.rating ?? "3",
        recommendation: defaultValues?.recommendation ?? "YES",
        comments: defaultValues?.comments ?? "",
      })
    }
  }, [open, defaultValues, form])

  const rating = Number(form.watch("rating"))

  async function onSubmit(values: InterviewFeedbackInput) {
    if (!interviewId) return
    setIsSubmitting(true)
    try {
      const result = await apiFetch(`/api/recruitment/interviews/${interviewId}/feedback`, { method: "POST", body: values })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Feedback submitted")
      onOpenChange(false)
      onSaved()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Interview feedback</DialogTitle>
          <DialogDescription>Your scorecard for {candidateName}.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating</FormLabel>
                  <FormControl>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" onClick={() => field.onChange(String(n))} className="p-0.5">
                          <Star className={cn("size-6", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recommendation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recommendation</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(RECOMMENDATION_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Strengths, concerns, notes for the hiring team…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
