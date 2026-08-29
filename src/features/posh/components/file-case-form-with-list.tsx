"use client"

import { useState } from "react"

import { FileCaseForm } from "@/features/posh/components/file-case-form"
import { MyFiledCasesList } from "@/features/posh/components/my-filed-cases-list"
import { apiFetch } from "@/lib/api-client"

type FiledCase = {
  id: string
  caseNumber: string
  status: string
  outcome: string | null
  createdAt: string
  resolvedAt: string | null
}

export function FileCaseFormWithList({ initialCases }: { initialCases: FiledCase[] }) {
  const [cases, setCases] = useState(initialCases)

  function reload() {
    apiFetch<{ cases: FiledCase[] }>("/api/posh/cases/filed").then((r) => r.success && setCases(r.data.cases))
  }

  return (
    <div className="flex flex-col gap-6">
      <FileCaseForm onFiled={reload} />
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Your reports</h2>
        <MyFiledCasesList cases={cases} />
      </div>
    </div>
  )
}
