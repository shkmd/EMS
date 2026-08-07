import { NextRequest, NextResponse } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { getDailyTaskReport } from "@/features/daily-log/queries"
import { dailyTaskReportQuerySchema } from "@/features/daily-log/schemas"
import { buildDailyTaskReportExcel, buildDailyTaskReportCsv } from "@/features/daily-log/export"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const query = dailyTaskReportQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const format = req.nextUrl.searchParams.get("format")

    const rows = await getDailyTaskReport(query, session)

    if (format === "xlsx") {
      const buffer = await buildDailyTaskReportExcel(rows)
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="daily-task-report.xlsx"`,
        },
      })
    }

    if (format === "csv") {
      const csv = buildDailyTaskReportCsv(rows)
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="daily-task-report.csv"`,
        },
      })
    }

    return apiSuccess({ rows })
  } catch (error) {
    return apiError(error)
  }
}
