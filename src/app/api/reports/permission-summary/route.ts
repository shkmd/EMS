import { NextRequest, NextResponse } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canViewReports } from "@/features/reports/authorization"
import { getPermissionSummaryReportRows } from "@/features/reports/queries"
import { permissionSummaryReportQuerySchema } from "@/features/reports/schemas"
import { buildPermissionSummaryReportExcel, buildPermissionSummaryReportCsv } from "@/features/reports/export"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    if (!canViewReports(session.role)) throw new ForbiddenError()

    const format = req.nextUrl.searchParams.get("format")

    const query = permissionSummaryReportQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const rows = await getPermissionSummaryReportRows(query)

    if (format === "xlsx") {
      const buffer = await buildPermissionSummaryReportExcel(rows)
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="permission-summary-report.xlsx"`,
        },
      })
    }

    if (format === "csv") {
      const csv = buildPermissionSummaryReportCsv(rows)
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="permission-summary-report.csv"`,
        },
      })
    }

    return apiSuccess({ rows })
  } catch (error) {
    return apiError(error)
  }
}
