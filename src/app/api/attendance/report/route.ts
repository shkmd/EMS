import { NextRequest, NextResponse } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { getAttendanceReport } from "@/features/attendance/queries"
import { attendanceReportQuerySchema } from "@/features/attendance/schemas"
import { buildAttendanceReportExcel, buildAttendanceReportCsv } from "@/features/attendance/export"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const query = attendanceReportQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const format = req.nextUrl.searchParams.get("format")

    const rows = await getAttendanceReport(query, session)

    if (format === "xlsx") {
      const buffer = await buildAttendanceReportExcel(rows)
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="attendance-report.xlsx"`,
        },
      })
    }

    if (format === "csv") {
      const csv = buildAttendanceReportCsv(rows)
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="attendance-report.csv"`,
        },
      })
    }

    return apiSuccess({ rows })
  } catch (error) {
    return apiError(error)
  }
}
