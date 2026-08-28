"use client"

import { useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { apiFetch } from "@/lib/api-client"
import { quizFormSchema, type QuizFormInput } from "@/features/learning/schemas"

type ExistingQuiz = {
  passingScore: number
  questions: { text: string; options: unknown; correctOptionIndex: number }[]
} | null

export function QuizBuilder({ courseId, existingQuiz, onSaved }: { courseId: string; existingQuiz: ExistingQuiz; onSaved: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<QuizFormInput>({
    resolver: zodResolver(quizFormSchema),
    defaultValues: {
      passingScore: existingQuiz ? String(existingQuiz.passingScore) : "70",
      questions: existingQuiz?.questions.map((q) => ({
        text: q.text,
        options: q.options as string[],
        correctOptionIndex: String(q.correctOptionIndex),
      })) ?? [{ text: "", options: ["", ""], correctOptionIndex: "0" }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "questions" })

  async function onSubmit(values: QuizFormInput) {
    setIsSubmitting(true)
    try {
      const result = await apiFetch(`/api/learning/courses/${courseId}/quiz`, { method: "PUT", body: values })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Quiz saved")
      onSaved()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const result = await apiFetch(`/api/learning/courses/${courseId}/quiz`, { method: "DELETE" })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Quiz removed")
      onSaved()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="passingScore"
              render={({ field }) => (
                <FormItem className="w-40">
                  <FormLabel>Passing score (%)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={100} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {fields.map((field, qIndex) => (
              <div key={field.id} className="flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <FormField
                    control={form.control}
                    name={`questions.${qIndex}.text`}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Question {qIndex + 1}</FormLabel>
                        <FormControl>
                          <Textarea rows={2} {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" className="mt-6" onClick={() => remove(qIndex)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name={`questions.${qIndex}.correctOptionIndex`}
                  render={({ field: correctField }) => {
                    const options: string[] = form.watch(`questions.${qIndex}.options`) ?? []
                    return (
                      <FormItem>
                        <FormLabel>Options (select the correct answer)</FormLabel>
                        <RadioGroup value={correctField.value} onValueChange={correctField.onChange} className="flex flex-col gap-2">
                          {options.map((_, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2">
                              <RadioGroupItem value={String(oIndex)} />
                              <FormField
                                control={form.control}
                                name={`questions.${qIndex}.options.${oIndex}`}
                                render={({ field: optField }) => (
                                  <Input {...optField} placeholder={`Option ${oIndex + 1}`} className="flex-1" />
                                )}
                              />
                              {options.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => {
                                    const next = options.filter((_, i) => i !== oIndex)
                                    form.setValue(`questions.${qIndex}.options`, next)
                                    if (Number(correctField.value) >= next.length) correctField.onChange("0")
                                  }}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </RadioGroup>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-1 w-fit"
                          onClick={() => form.setValue(`questions.${qIndex}.options`, [...options, ""])}
                        >
                          <Plus className="size-3.5" /> Add option
                        </Button>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => append({ text: "", options: ["", ""], correctOptionIndex: "0" })}
            >
              <Plus /> Add question
            </Button>

            <div className="flex items-center justify-between border-t pt-4">
              {existingQuiz ? (
                <Button type="button" variant="ghost" className="text-destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting && <Loader2 className="animate-spin" />}
                  Remove quiz
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Save quiz
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
