import { NextRequest, NextResponse } from "next/server"

import { apiError } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError, ValidationError } from "@/lib/errors"
import { canViewEmployeeList } from "@/features/employees/authorization"
import { listAllEmployeesForExport } from "@/features/employees/queries"
import { employeeListQuerySchema } from "@/features/employees/schemas"
import { buildEmployeesExcelBuffer, buildEmployeesPdfBuffer } from "@/features/employees/export"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    if (!canViewEmployeeList(session.role)) throw new ForbiddenError()

    const format = req.nextUrl.searchParams.get("format")
    if (format !== "xlsx" && format !== "pdf") {
      throw new ValidationError('format must be "xlsx" or "pdf"')
    }

    const query = employeeListQuerySchema.omit({ page: true, pageSize: true }).parse(
      Object.fromEntries(req.nextUrl.searchParams)
    )
    const employees = await listAllEmployeesForExport(query, session)

    if (format === "xlsx") {
      const buffer = await buildEmployeesExcelBuffer(employees)
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="employees.xlsx"`,
        },
      })
    }

    const buffer = await buildEmployeesPdfBuffer(employees)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="employees.pdf"`,
      },
    })
  } catch (error) {
    return apiError(error)
  }
}
