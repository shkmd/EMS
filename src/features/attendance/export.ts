import "server-only"

import ExcelJS from "exceljs"
import { format } from "date-fns"

type ReportRow = {
  date: Date
  status: string
  checkIn: Date | null
  checkOut: Date | null
  workingMinutes: number
  breakMinutes: number
  employee: { employeeCode: string; firstName: string; lastName: string; department: { name: string } | null }
}

const COLUMNS = [
  { header: "Date", key: "date", width: 14 },
  { header: "Employee Code", key: "employeeCode", width: 16 },
  { header: "Name", key: "name", width: 24 },
  { header: "Department", key: "department", width: 18 },
  { header: "Status", key: "status", width: 16 },
  { header: "Check In", key: "checkIn", width: 12 },
  { header: "Check Out", key: "checkOut", width: 12 },
  { header: "Working Hours", key: "workingHours", width: 14 },
]

function toRow(r: ReportRow) {
  return {
    date: format(r.date, "dd MMM yyyy"),
    employeeCode: r.employee.employeeCode,
    name: `${r.employee.firstName} ${r.employee.lastName}`,
    department: r.employee.department?.name ?? "—",
    status: r.status.replace(/_/g, " "),
    checkIn: r.checkIn ? format(r.checkIn, "HH:mm") : "—",
    checkOut: r.checkOut ? format(r.checkOut, "HH:mm") : "—",
    workingHours: (r.workingMinutes / 60).toFixed(2),
  }
}

export async function buildAttendanceReportExcel(rows: ReportRow[]) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "EMS"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet("Attendance")
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

export function buildAttendanceReportCsv(rows: ReportRow[]) {
  const header = COLUMNS.map((c) => c.header).join(",")
  const lines = rows.map((r) => {
    const row = toRow(r)
    return COLUMNS.map((c) => csvEscape(String(row[c.key as keyof typeof row]))).join(",")
  })
  return [header, ...lines].join("\n")
}
