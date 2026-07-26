"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { apiFetch } from "@/lib/api-client"
import { assetFormSchema, assetCategoryValues, type AssetFormInput } from "@/features/assets/schemas"
import { ASSET_CATEGORY_LABELS } from "@/features/assets/lib/labels"

export type AssetEditTarget = {
  id: string
  assetTag: string
  category: string
  name: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  purchaseDate: string | null
  purchaseCost: string | null
  status: string
} | null

export function AssetFormDialog({
  target,
  open,
  onOpenChange,
  onSaved,
}: {
  target: AssetEditTarget
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!target

  const form = useForm<AssetFormInput>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      assetTag: "",
      category: "LAPTOP",
      name: "",
      brand: "",
      model: "",
      serialNumber: "",
      purchaseDate: "",
      purchaseCost: "",
      status: "AVAILABLE",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        assetTag: target?.assetTag ?? "",
        category: (target?.category as AssetFormInput["category"]) ?? "LAPTOP",
        name: target?.name ?? "",
        brand: target?.brand ?? "",
        model: target?.model ?? "",
        serialNumber: target?.serialNumber ?? "",
        purchaseDate: target?.purchaseDate ? target.purchaseDate.slice(0, 10) : "",
        purchaseCost: target?.purchaseCost ?? "",
        status: (target?.status as AssetFormInput["status"]) ?? "AVAILABLE",
      })
    }
  }, [open, target, form])

  async function onSubmit(values: AssetFormInput) {
    setIsSubmitting(true)
    try {
      const result = isEdit
        ? await apiFetch(`/api/assets/${target!.id}`, { method: "PATCH", body: values })
        : await apiFetch("/api/assets", { method: "POST", body: values })

      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(isEdit ? "Asset updated" : "Asset added")
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit asset" : "Add asset"}</DialogTitle>
          <DialogDescription>Track a physical asset in the company inventory.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assetTag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset tag</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. LAP-0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assetCategoryValues.map((c) => (
                          <SelectItem key={c} value={c}>
                            {ASSET_CATEGORY_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. MacBook Pro 14&quot;" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchaseCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase cost</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={target?.status === "ASSIGNED"}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="IN_REPAIR">In repair</SelectItem>
                      <SelectItem value="RETIRED">Retired</SelectItem>
                      {target?.status === "ASSIGNED" && <SelectItem value="ASSIGNED">Assigned</SelectItem>}
                    </SelectContent>
                  </Select>
                  {target?.status === "ASSIGNED" && (
                    <p className="text-xs text-muted-foreground">
                      This asset is currently assigned — use &quot;Return&quot; from the inventory list to change its status.
                    </p>
                  )}
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
                {isEdit ? "Save changes" : "Add asset"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
