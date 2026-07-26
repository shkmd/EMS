import { NextRequest, NextResponse } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { canViewReports } from "@/features/reports/authorization"
import { getLeaveReportRows } from "@/features/reports/queries"
import { leaveReportQuerySchema } from "@/features/reports/schemas"
import { buildLeaveReportExcel, buildLeaveReportCsv } from "@/features/reports/export"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    if (!canViewReports(session.role)) throw new ForbiddenError()

    const format = req.nextUrl.searchParams.get("format")

    const query = leaveReportQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const rows = await getLeaveReportRows(query)
    const exportRows = rows.map((r) => ({ ...r, days: Number(r.days) }))

    if (format === "xlsx") {
      const buffer = await buildLeaveReportExcel(exportRows)
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="leave-report.xlsx"`,
        },
      })
    }

    if (format === "csv") {
      const csv = buildLeaveReportCsv(exportRows)
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="leave-report.csv"`,
        },
      })
    }

    return apiSuccess({ rows: exportRows })
  } catch (error) {
    return apiError(error)
  }
}
