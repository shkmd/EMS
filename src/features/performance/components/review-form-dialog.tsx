"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { apiFetch } from "@/lib/api-client"
import { reviewFormSchema, type ReviewFormInput, DEFAULT_REVIEW_CRITERIA } from "@/features/performance/schemas"

export function ReviewFormDialog({ employeeId, onSaved }: { employeeId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ReviewFormInput>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      employeeId,
      reviewPeriodStart: "",
      reviewPeriodEnd: "",
      summary: "",
      ratings: DEFAULT_REVIEW_CRITERIA.map((criterion) => ({ criterion, rating: "3", comment: "" })),
    },
  })

  async function onSubmit(values: ReviewFormInput) {
    setIsSubmitting(true)
    try {
      const result = await apiFetch("/api/performance/reviews", { method: "POST", body: values })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Review draft created")
      setOpen(false)
      form.reset({
        employeeId,
        reviewPeriodStart: "",
        reviewPeriodEnd: "",
        summary: "",
        ratings: DEFAULT_REVIEW_CRITERIA.map((criterion) => ({ criterion, rating: "3", comment: "" })),
      })
      onSaved()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> New Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New performance review</DialogTitle>
          <DialogDescription>
            Rate each criterion 1–5. The review is saved as a draft — submit it separately when ready.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reviewPeriodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reviewPeriodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period end</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col gap-3">
              {DEFAULT_REVIEW_CRITERIA.map((criterion, index) => (
                <div key={criterion} className="grid grid-cols-3 gap-2 rounded-lg border p-3">
                  <p className="col-span-3 text-sm font-medium">{criterion}</p>
                  <FormField
                    control={form.control}
                    name={`ratings.${index}.rating`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Rating</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`ratings.${index}.comment`}
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-xs">Comment (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall summary</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Save draft
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
