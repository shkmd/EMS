"use client"

import { useRouter, useSearchParams } from "next/navigation"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ALL = "__all__"

export function VerticalFilter({ verticals }: { verticals: { id: string; name: string }[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get("vertical") ?? ALL

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === ALL) {
      params.delete("vertical")
    } else {
      params.set("vertical", value)
    }
    router.push(`/dashboard${params.toString() ? `?${params}` : ""}`)
  }

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Vertical" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All Verticals</SelectItem>
        {verticals.map((v) => (
          <SelectItem key={v.id} value={v.id}>
            {v.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
