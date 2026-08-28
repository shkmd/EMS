"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { apiFetch } from "@/lib/api-client"
import { EMPLOYMENT_TYPE_LABEL } from "@/features/recruitment/lib/labels"
import { jobOpeningFormSchema, type JobOpeningFormInput } from "@/features/recruitment/schemas"

const NONE = "__none__"

export type JobOpeningEditTarget = {
  id: string
  title: string
  departmentId: string | null
  designationId: string | null
  employmentType: string
  numberOfPositions: number
  description: string | null
  requirements: string | null
} | null

export function JobOpeningFormDialog({
  target,
  open,
  onOpenChange,
  onSaved,
}: {
  target: JobOpeningEditTarget
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [designations, setDesignations] = useState<{ id: string; title: string; department: { id: string } | null }[]>([])
  const isEdit = !!target

  const form = useForm<JobOpeningFormInput>({
    resolver: zodResolver(jobOpeningFormSchema),
    defaultValues: {
      title: "",
      employmentType: "FULL_TIME",
      numberOfPositions: "1",
    },
  })

  useEffect(() => {
    if (open && departments.length === 0) {
      apiFetch<{ departments: typeof departments }>("/api/departments").then((r) => r.success && setDepartments(r.data.departments))
      apiFetch<{ designations: typeof designations }>("/api/designations").then((r) => r.success && setDesignations(r.data.designations))
    }
  }, [open, departments.length])

  useEffect(() => {
    if (open) {
      form.reset({
        title: target?.title ?? "",
        departmentId: target?.departmentId ?? undefined,
        designationId: target?.designationId ?? undefined,
        employmentType: (target?.employmentType as JobOpeningFormInput["employmentType"]) ?? "FULL_TIME",
        numberOfPositions: target ? String(target.numberOfPositions) : "1",
        description: target?.description ?? undefined,
        requirements: target?.requirements ?? undefined,
      })
    }
  }, [open, target, form])

  const selectedDepartmentId = form.watch("departmentId")
  const filteredDesignations = designations.filter((d) => !selectedDepartmentId || d.department?.id === selectedDepartmentId)

  async function onSubmit(values: JobOpeningFormInput) {
    setIsSubmitting(true)
    try {
      const result = isEdit
        ? await apiFetch(`/api/recruitment/job-openings/${target!.id}`, { method: "PATCH", body: values })
        : await apiFetch("/api/recruitment/job-openings", { method: "POST", body: values })

      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(isEdit ? "Job opening updated" : "Job opening created")
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit job opening" : "New job opening"}</DialogTitle>
          <DialogDescription>Post a role to start tracking candidates against it.</DialogDescription>
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
                    <Input placeholder="e.g. Senior Frontend Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select
                      value={field.value ?? NONE}
                      onValueChange={(v) => {
                        field.onChange(v === NONE ? undefined : v)
                        form.setValue("designationId", undefined)
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
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
                name="designationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {filteredDesignations.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(EMPLOYMENT_TYPE_LABEL).map(([value, label]) => (
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
                name="numberOfPositions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of positions</FormLabel>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Role summary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requirements</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Must-have skills, experience, etc." {...field} />
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
                {isEdit ? "Save changes" : "Create opening"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
