"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Plus, Trash2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api-client"
import { initials } from "@/features/messaging/lib/initials"
import type { AssigneeRef } from "@/features/projects/lib/types"
import { skillFormSchema, type SkillFormInput } from "@/features/learning/schemas"

type SkillRow = {
  id: string
  name: string
  proficiency: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"
  notes: string | null
  employee: { id: string; firstName: string; lastName: string; department: { name: string } | null }
}

const PROFICIENCY_LABELS: Record<SkillRow["proficiency"], string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
}

export function SkillMatrix({ initialSkills, employees }: { initialSkills: SkillRow[]; employees: AssigneeRef[] }) {
  const [skills, setSkills] = useState(initialSkills)
  const [formOpen, setFormOpen] = useState(false)

  function reload() {
    apiFetch<{ skills: SkillRow[] }>("/api/learning/skills").then((r) => r.success && setSkills(r.data.skills))
  }

  async function handleDelete(id: string) {
    const result = await apiFetch(`/api/learning/skills/${id}`, { method: "DELETE" })
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    reload()
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setFormOpen(true)}>
            <Plus /> Add skill
          </Button>
        </div>

        {skills.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No skills recorded yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead>Proficiency</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {skills.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarImage src={`/api/employees/${s.employee.id}/photo`} />
                          <AvatarFallback className="text-xs">{initials(`${s.employee.firstName} ${s.employee.lastName}`)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {s.employee.firstName} {s.employee.lastName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.employee.department?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{PROFICIENCY_LABELS[s.proficiency]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{s.notes ?? "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <SkillFormDialog employees={employees} open={formOpen} onOpenChange={setFormOpen} onSaved={reload} />
    </Card>
  )
}

function SkillFormDialog({
  employees,
  open,
  onOpenChange,
  onSaved,
}: {
  employees: AssigneeRef[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SkillFormInput>({
    resolver: zodResolver(skillFormSchema),
    defaultValues: { employeeId: "", name: "", proficiency: "BEGINNER" },
  })

  async function onSubmit(values: SkillFormInput) {
    setIsSubmitting(true)
    try {
      const result = await apiFetch("/api/learning/skills", { method: "POST", body: values })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Skill saved")
      onOpenChange(false)
      form.reset({ employeeId: "", name: "", proficiency: "BEGINNER" })
      onSaved()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add skill</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skill name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. First Aid" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="proficiency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proficiency</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PROFICIENCY_LABELS).map(([value, label]) => (
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
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
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
