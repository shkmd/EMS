"use client"

import { useEffect, useState } from "react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/api-client"
import { GoalsPanel } from "@/features/performance/components/goals-panel"
import { KpisPanel } from "@/features/performance/components/kpis-panel"
import { ReviewsPanel } from "@/features/performance/components/reviews-panel"

type Employee = { id: string; firstName: string; lastName: string }

export function TeamPerformance() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedId, setSelectedId] = useState<string>("")

  useEffect(() => {
    apiFetch<{ employees: Employee[] }>("/api/performance/employees").then((result) => {
      if (result.success) {
        setEmployees(result.data.employees)
        if (result.data.employees.length > 0) setSelectedId(result.data.employees[0]!.id)
      }
    })
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select an employee" />
        </SelectTrigger>
        <SelectContent>
          {employees.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.firstName} {e.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedId ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GoalsPanel employeeId={selectedId} canManage />
          <KpisPanel employeeId={selectedId} canManage />
          <div className="lg:col-span-2">
            <ReviewsPanel employeeId={selectedId} canManage isSelf={false} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No employees to manage yet.</p>
      )}
    </div>
  )
}
