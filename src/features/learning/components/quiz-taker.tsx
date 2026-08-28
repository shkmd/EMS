"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api-client"

type QuizQuestion = { id: string; text: string; options: string[]; position: number }

export function QuizTaker({
  enrollmentId,
  questions,
  passingScore,
  onResult,
}: {
  enrollmentId: string
  questions: QuizQuestion[]
  passingScore: number
  onResult: (result: { score: number; passed: boolean }) => void
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null)

  const allAnswered = questions.every((q) => answers[q.id] !== undefined)

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const orderedAnswers = questions.map((q) => answers[q.id])
      const res = await apiFetch<{ score: number; passed: boolean; passingScore: number }>(`/api/learning/enrollments/${enrollmentId}/quiz`, {
        method: "POST",
        body: { answers: orderedAnswers },
      })
      if (!res.success) {
        toast.error(res.error.message)
        return
      }
      setResult(res.data)
      onResult(res.data)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (result) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          {result.passed ? (
            <CheckCircle2 className="size-10 text-emerald-500" />
          ) : (
            <XCircle className="size-10 text-destructive" />
          )}
          <p className="text-lg font-semibold">{result.passed ? "You passed!" : "Not quite"}</p>
          <p className="text-sm text-muted-foreground">
            Score: {result.score}% (passing score: {passingScore}%)
          </p>
          {!result.passed && (
            <Button
              variant="outline"
              onClick={() => {
                setAnswers({})
                setResult(null)
              }}
            >
              Try again
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {questions.map((q, qIndex) => (
          <div key={q.id} className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              {qIndex + 1}. {q.text}
            </p>
            <RadioGroup
              value={answers[q.id] !== undefined ? String(answers[q.id]) : undefined}
              onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: Number(v) }))}
            >
              {q.options.map((option, oIndex) => (
                <div key={oIndex} className="flex items-center gap-2">
                  <RadioGroupItem value={String(oIndex)} id={`${q.id}-${oIndex}`} />
                  <Label htmlFor={`${q.id}-${oIndex}`} className="font-normal">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
        <Button onClick={handleSubmit} disabled={!allAnswered || isSubmitting} className="w-fit">
          {isSubmitting && <Loader2 className="animate-spin" />}
          Submit quiz
        </Button>
      </CardContent>
    </Card>
  )
}
