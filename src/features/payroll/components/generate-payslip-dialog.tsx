"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Plus, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { apiFetch } from "@/lib/api-client"
import { payslipFormSchema, type PayslipFormInput } from "@/features/payroll/schemas"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

type Employee = { id: string; label: string }
type Defaults = {
  basic: number
  hra: number
  conveyanceAllowance: number
  medicalAllowance: number
  specialAllowance: number
  otherAllowances: number
  pf: number
  esi: number
  professionalTax: number
  otherDeductions: number
  remarks?: string
}

const ZERO_DEFAULTS: PayslipFormInput = {
  employeeId: "",
  month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()),
  basic: "0",
  hra: "0",
  conveyanceAllowance: "0",
  medicalAllowance: "0",
  specialAllowance: "0",
  otherAllowances: "0",
  pf: "0",
  esi: "0",
  professionalTax: "0",
  otherDeductions: "0",
  remarks: "",
}

export function GeneratePayslipDialog({ employees, onSaved }: { employees: Employee[]; onSaved: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false)

  const form = useForm<PayslipFormInput>({
    resolver: zodResolver(payslipFormSchema),
    defaultValues: ZERO_DEFAULTS,
  })

  const values = form.watch()
  const gross =
    Number(values.basic || 0) +
    Number(values.hra || 0) +
    Number(values.conveyanceAllowance || 0) +
    Number(values.medicalAllowance || 0) +
    Number(values.specialAllowance || 0) +
    Number(values.otherAllowances || 0)
  const deductions =
    Number(values.pf || 0) + Number(values.esi || 0) + Number(values.professionalTax || 0) + Number(values.otherDeductions || 0)
  const net = gross - deductions

  useEffect(() => {
    if (!open) form.reset(ZERO_DEFAULTS)
  }, [open, form])

  async function loadDefaults() {
    const { employeeId, month, year } = form.getValues()
    if (!employeeId || !month || !year) {
      toast.error("Select an employee, month, and year first")
      return
    }
    setIsLoadingDefaults(true)
    try {
      const result = await apiFetch<{ defaults: Defaults }>(
        `/api/payroll/defaults?employeeId=${employeeId}&month=${month}&year=${year}`
      )
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      const d = result.data.defaults
      form.setValue("basic", String(d.basic))
      form.setValue("hra", String(d.hra))
      form.setValue("conveyanceAllowance", String(d.conveyanceAllowance))
      form.setValue("medicalAllowance", String(d.medicalAllowance))
      form.setValue("specialAllowance", String(d.specialAllowance))
      form.setValue("otherAllowances", String(d.otherAllowances))
      form.setValue("pf", String(d.pf))
      form.setValue("esi", String(d.esi))
      form.setValue("professionalTax", String(d.professionalTax))
      form.setValue("otherDeductions", String(d.otherDeductions))
      if (d.remarks) form.setValue("remarks", d.remarks)
      toast.success("Defaults loaded — review before generating")
    } finally {
      setIsLoadingDefaults(false)
    }
  }

  async function onSubmit(values: PayslipFormInput) {
    setIsSubmitting(true)
    try {
      const result = await apiFetch("/api/payroll/generate", { method: "POST", body: values })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Payslip generated")
      setOpen(false)
      onSaved()
      router.refresh()
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const moneyField = (name: keyof PayslipFormInput, label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type="number" min={0} step="0.01" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Generate Payslip
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate payslip</DialogTitle>
          <DialogDescription>
            Select an employee and period, load suggested defaults, then review before generating.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem className="col-span-3 sm:col-span-1">
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
                            {e.label}
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
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={m} value={String(i + 1)}>
                            {m}
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
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="button" variant="outline" onClick={loadDefaults} disabled={isLoadingDefaults}>
              {isLoadingDefaults ? <Loader2 className="animate-spin" /> : <Wand2 />}
              Load suggested defaults
            </Button>

            <div className="grid grid-cols-2 gap-4">
              <p className="col-span-2 text-sm font-medium text-muted-foreground">Earnings</p>
              {moneyField("basic", "Basic")}
              {moneyField("hra", "HRA")}
              {moneyField("conveyanceAllowance", "Conveyance Allowance")}
              {moneyField("medicalAllowance", "Medical Allowance")}
              {moneyField("specialAllowance", "Special Allowance")}
              {moneyField("otherAllowances", "Other Allowances")}

              <p className="col-span-2 mt-2 text-sm font-medium text-muted-foreground">Deductions</p>
              {moneyField("pf", "PF")}
              {moneyField("esi", "ESI")}
              {moneyField("professionalTax", "Professional Tax")}
              {moneyField("otherDeductions", "Other Deductions")}
            </div>

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between rounded-lg border bg-muted/40 p-3 text-sm">
              <span>Gross: <strong>{gross.toFixed(2)}</strong></span>
              <span>Deductions: <strong>{deductions.toFixed(2)}</strong></span>
              <span>Net Salary: <strong>{net.toFixed(2)}</strong></span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
