import "server-only"

import ExcelJS from "exceljs"
import { format } from "date-fns"

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function buildCsv(columns: { header: string; key: string }[], rows: Record<string, unknown>[]) {
  const header = columns.map((c) => c.header).join(",")
  const lines = rows.map((row) => columns.map((c) => csvEscape(String(row[c.key] ?? ""))).join(","))
  return [header, ...lines].join("\n")
}

async function buildExcel(sheetName: string, columns: { header: string; key: string; width: number }[], rows: Record<string, unknown>[]) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "EMS"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(sheetName)
  sheet.columns = columns
  sheet.getRow(1).font = { bold: true }

  for (const row of rows) sheet.addRow(row)

  return workbook.xlsx.writeBuffer()
}

type LeaveReportRow = {
  startDate: Date
  endDate: Date
  days: number
  status: string
  reason: string
  leaveType: { name: string }
  employee: { employeeCode: string; firstName: string; lastName: string; department: { name: string } | null }
}

const LEAVE_COLUMNS = [
  { header: "Employee Code", key: "employeeCode", width: 16 },
  { header: "Name", key: "name", width: 24 },
  { header: "Department", key: "department", width: 18 },
  { header: "Leave Type", key: "leaveType", width: 18 },
  { header: "Start Date", key: "startDate", width: 14 },
  { header: "End Date", key: "endDate", width: 14 },
  { header: "Days", key: "days", width: 10 },
  { header: "Status", key: "status", width: 16 },
  { header: "Reason", key: "reason", width: 32 },
]

function toLeaveRow(r: LeaveReportRow) {
  return {
    employeeCode: r.employee.employeeCode,
    name: `${r.employee.firstName} ${r.employee.lastName}`,
    department: r.employee.department?.name ?? "—",
    leaveType: r.leaveType.name,
    startDate: format(r.startDate, "dd MMM yyyy"),
    endDate: format(r.endDate, "dd MMM yyyy"),
    days: r.days,
    status: r.status.replace(/_/g, " "),
    reason: r.reason,
  }
}

export async function buildLeaveReportExcel(rows: LeaveReportRow[]) {
  return buildExcel("Leave Report", LEAVE_COLUMNS, rows.map(toLeaveRow))
}

export function buildLeaveReportCsv(rows: LeaveReportRow[]) {
  return buildCsv(LEAVE_COLUMNS, rows.map(toLeaveRow))
}

type AssetReportRow = {
  assetTag: string
  category: string
  name: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  status: string
  purchaseDate: Date | null
  purchaseCost: number | null
  currentAssignment: { employee: { firstName: string; lastName: string } } | null
}

const ASSET_COLUMNS = [
  { header: "Asset Tag", key: "assetTag", width: 16 },
  { header: "Category", key: "category", width: 14 },
  { header: "Name", key: "name", width: 24 },
  { header: "Brand", key: "brand", width: 16 },
  { header: "Model", key: "model", width: 16 },
  { header: "Serial Number", key: "serialNumber", width: 20 },
  { header: "Status", key: "status", width: 14 },
  { header: "Purchase Date", key: "purchaseDate", width: 16 },
  { header: "Purchase Cost", key: "purchaseCost", width: 14 },
  { header: "Assigned To", key: "assignedTo", width: 24 },
]

function toAssetRow(a: AssetReportRow) {
  return {
    assetTag: a.assetTag,
    category: a.category.replace(/_/g, " "),
    name: a.name,
    brand: a.brand ?? "—",
    model: a.model ?? "—",
    serialNumber: a.serialNumber ?? "—",
    status: a.status.replace(/_/g, " "),
    purchaseDate: a.purchaseDate ? format(a.purchaseDate, "dd MMM yyyy") : "—",
    purchaseCost: a.purchaseCost !== null ? a.purchaseCost : "—",
    assignedTo: a.currentAssignment ? `${a.currentAssignment.employee.firstName} ${a.currentAssignment.employee.lastName}` : "—",
  }
}

export async function buildAssetReportExcel(rows: AssetReportRow[]) {
  return buildExcel("Asset Report", ASSET_COLUMNS, rows.map(toAssetRow))
}

export function buildAssetReportCsv(rows: AssetReportRow[]) {
  return buildCsv(ASSET_COLUMNS, rows.map(toAssetRow))
}

type LateSummaryReportRow = {
  employeeCode: string
  firstName: string
  lastName: string
  department: string | null
  daysPresent: number
  daysLate: number
  totalLateMinutes: number
}

const LATE_SUMMARY_COLUMNS = [
  { header: "Employee Code", key: "employeeCode", width: 16 },
  { header: "Name", key: "name", width: 24 },
  { header: "Department", key: "department", width: 18 },
  { header: "Days Present", key: "daysPresent", width: 14 },
  { header: "Days Late", key: "daysLate", width: 12 },
  { header: "Total Late Minutes", key: "totalLateMinutes", width: 18 },
]

function toLateSummaryRow(r: LateSummaryReportRow) {
  return {
    employeeCode: r.employeeCode,
    name: `${r.firstName} ${r.lastName}`,
    department: r.department ?? "—",
    daysPresent: r.daysPresent,
    daysLate: r.daysLate,
    totalLateMinutes: r.totalLateMinutes,
  }
}

export async function buildLateSummaryReportExcel(rows: LateSummaryReportRow[]) {
  return buildExcel("Late Summary", LATE_SUMMARY_COLUMNS, rows.map(toLateSummaryRow))
}

export function buildLateSummaryReportCsv(rows: LateSummaryReportRow[]) {
  return buildCsv(LATE_SUMMARY_COLUMNS, rows.map(toLateSummaryRow))
}
