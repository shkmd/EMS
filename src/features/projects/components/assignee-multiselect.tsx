"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { initials } from "@/features/messaging/lib/initials"
import type { AssigneeRef } from "@/features/projects/lib/types"

export function AssigneeMultiselect({
  options,
  value,
  onChange,
}: {
  options: AssigneeRef[]
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.filter((o) => value.includes(o.id))

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selected.length > 0 ? `${selected.length} assigned` : "Assign to…"}
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Search people…" />
            <CommandList>
              <CommandEmpty>No one found.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem key={o.id} value={o.name} onSelect={() => toggle(o.id)}>
                    <Check className={cn("size-4", value.includes(o.id) ? "opacity-100" : "opacity-0")} />
                    <Avatar className="size-5">
                      {o.profilePhotoUrl && <AvatarImage src={`/api/employees/${o.id}/photo`} />}
                      <AvatarFallback className="text-[10px]">{initials(o.name)}</AvatarFallback>
                    </Avatar>
                    {o.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
              {s.name}
              <button type="button" onClick={() => toggle(s.id)} className="rounded-full hover:bg-muted-foreground/20">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
