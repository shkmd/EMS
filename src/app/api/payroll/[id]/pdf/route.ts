import { NextRequest, NextResponse } from "next/server"

import { apiError } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { getPayslipDetail } from "@/features/payroll/queries"
import { buildPayslipPdf } from "@/features/payroll/export"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const payslip = await getPayslipDetail(id, session)

    const companySettings = await prisma.companySettings.findUnique({ where: { id: 1 } })
    const company = {
      companyName: companySettings?.companyName ?? "Company",
      address: companySettings?.address ?? null,
      currency: companySettings?.currency ?? "USD",
    }

    const buffer = await buildPayslipPdf(
      {
        month: payslip.month,
        year: payslip.year,
        basic: Number(payslip.basic),
        hra: Number(payslip.hra),
        conveyanceAllowance: Number(payslip.conveyanceAllowance),
        medicalAllowance: Number(payslip.medicalAllowance),
        specialAllowance: Number(payslip.specialAllowance),
        otherAllowances: Number(payslip.otherAllowances),
        grossEarnings: Number(payslip.grossEarnings),
        pf: Number(payslip.pf),
        esi: Number(payslip.esi),
        professionalTax: Number(payslip.professionalTax),
        otherDeductions: Number(payslip.otherDeductions),
        totalDeductions: Number(payslip.totalDeductions),
        netSalary: Number(payslip.netSalary),
        status: payslip.status,
        employee: payslip.employee,
      },
      company
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="payslip-${payslip.employee.employeeCode}-${payslip.month}-${payslip.year}.pdf"`,
      },
    })
  } catch (error) {
    return apiError(error)
  }
}
