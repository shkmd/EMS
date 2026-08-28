"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { apiFetch } from "@/lib/api-client"
import { courseFormSchema, type CourseFormInput } from "@/features/learning/schemas"

export type CourseEditTarget = {
  id: string
  title: string
  description: string | null
  category: string | null
  durationMinutes: number | null
  skillGranted: string | null
  isPublished: boolean
} | null

export function CourseFormDialog({
  target,
  open,
  onOpenChange,
  onSaved,
}: {
  target: CourseEditTarget
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (courseId: string) => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!target

  const form = useForm<CourseFormInput>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: { title: "", isPublished: false },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        title: target?.title ?? "",
        description: target?.description ?? undefined,
        category: target?.category ?? undefined,
        durationMinutes: target?.durationMinutes != null ? String(target.durationMinutes) : undefined,
        skillGranted: target?.skillGranted ?? undefined,
        isPublished: target?.isPublished ?? false,
      })
    }
  }, [open, target, form])

  async function onSubmit(values: CourseFormInput) {
    setIsSubmitting(true)
    try {
      const result = isEdit
        ? await apiFetch<{ course: { id: string } }>(`/api/learning/courses/${target!.id}`, { method: "PATCH", body: values })
        : await apiFetch<{ course: { id: string } }>("/api/learning/courses", { method: "POST", body: values })

      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(isEdit ? "Course updated" : "Course created")
      onOpenChange(false)
      onSaved(result.data.course.id)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit course" : "New course"}</DialogTitle>
          <DialogDescription>Add a training course to the catalog.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Workplace Safety Fundamentals" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Compliance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} placeholder="30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="skillGranted"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skill granted on completion (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. First Aid Certified" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Published</FormLabel>
                    <p className="text-xs text-muted-foreground">Visible in the catalog and assignable to employees.</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isEdit ? "Save changes" : "Create course"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
