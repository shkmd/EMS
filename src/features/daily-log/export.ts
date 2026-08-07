import "server-only"

import ExcelJS from "exceljs"
import { format } from "date-fns"

import type { DailyTaskReportRow } from "@/features/daily-log/queries"

const COLUMNS = [
  { header: "Date", key: "date", width: 14 },
  { header: "Employee Code", key: "employeeCode", width: 16 },
  { header: "Name", key: "name", width: 24 },
  { header: "Department", key: "department", width: 18 },
  { header: "Today's Update", key: "update", width: 40 },
  { header: "Task Activity", key: "taskActivity", width: 50 },
]

function toRow(r: DailyTaskReportRow) {
  return {
    date: format(new Date(r.date), "dd MMM yyyy"),
    employeeCode: r.employeeCode,
    name: `${r.firstName} ${r.lastName}`,
    department: r.department ?? "—",
    update: r.update ?? "—",
    taskActivity: r.taskActivity ?? "—",
  }
}

export async function buildDailyTaskReportExcel(rows: DailyTaskReportRow[]) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "EMS"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet("Daily Tasks")
  sheet.columns = COLUMNS
  sheet.getRow(1).font = { bold: true }

  for (const row of rows) {
    sheet.addRow(toRow(row))
  }

  return workbook.xlsx.writeBuffer()
}

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildDailyTaskReportCsv(rows: DailyTaskReportRow[]) {
  const header = COLUMNS.map((c) => c.header).join(",")
  const lines = rows.map((r) => {
    const row = toRow(r)
    return COLUMNS.map((c) => csvEscape(String(row[c.key as keyof typeof row]))).join(",")
  })
  return [header, ...lines].join("\n")
}
