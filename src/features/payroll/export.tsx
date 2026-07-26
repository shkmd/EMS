import "server-only"

import ExcelJS from "exceljs"
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

type PayslipData = {
  month: number
  year: number
  basic: number
  hra: number
  conveyanceAllowance: number
  medicalAllowance: number
  specialAllowance: number
  otherAllowances: number
  grossEarnings: number
  pf: number
  esi: number
  professionalTax: number
  otherDeductions: number
  totalDeductions: number
  netSalary: number
  status: string
  employee: {
    employeeCode: string
    firstName: string
    lastName: string
    department: { name: string } | null
  }
}

type CompanyInfo = {
  companyName: string
  address: string | null
  currency: string
}

function formatMoney(n: number, currency: string) {
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 16, borderBottomWidth: 2, borderBottomColor: "#111", paddingBottom: 8 },
  companyName: { fontSize: 16, fontWeight: 700 },
  muted: { color: "#666", fontSize: 9 },
  title: { fontSize: 13, fontWeight: 700, marginTop: 12, marginBottom: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  infoBlock: { flexDirection: "column", gap: 2 },
  sectionTitle: { fontSize: 10, fontWeight: 700, marginBottom: 4, backgroundColor: "#f3f3f1", padding: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: "#eee" },
  columns: { flexDirection: "row", gap: 16 },
  column: { flex: 1 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 6, fontWeight: 700 },
  netSalaryBox: { marginTop: 20, padding: 12, backgroundColor: "#111", color: "#fff", flexDirection: "row", justifyContent: "space-between" },
  netSalaryLabel: { fontSize: 12, fontWeight: 700 },
  netSalaryValue: { fontSize: 16, fontWeight: 700 },
  footer: { marginTop: 24, fontSize: 8, color: "#999" },
})

function PayslipDocument({ payslip, company }: { payslip: PayslipData; company: CompanyInfo }) {
  const monthLabel = `${MONTH_NAMES[payslip.month - 1]} ${payslip.year}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{company.companyName}</Text>
          {company.address && <Text style={styles.muted}>{company.address}</Text>}
        </View>

        <Text style={styles.title}>Payslip — {monthLabel}</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text>
              {payslip.employee.firstName} {payslip.employee.lastName}
            </Text>
            <Text style={styles.muted}>{payslip.employee.employeeCode}</Text>
            <Text style={styles.muted}>{payslip.employee.department?.name ?? "—"}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.muted}>Status: {payslip.status}</Text>
          </View>
        </View>

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Earnings</Text>
            <View style={styles.row}>
              <Text>Basic</Text>
              <Text>{formatMoney(payslip.basic, company.currency)}</Text>
            </View>
            <View style={styles.row}>
              <Text>HRA</Text>
              <Text>{formatMoney(payslip.hra, company.currency)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Conveyance Allowance</Text>
              <Text>{formatMoney(payslip.conveyanceAllowance, company.currency)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Medical Allowance</Text>
              <Text>{formatMoney(payslip.medicalAllowance, company.currency)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Special Allowance</Text>
              <Text>{formatMoney(payslip.specialAllowance, company.currency)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Other Allowances</Text>
              <Text>{formatMoney(payslip.otherAllowances, company.currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Gross Earnings</Text>
              <Text>{formatMoney(payslip.grossEarnings, company.currency)}</Text>
            </View>
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Deductions</Text>
            <View style={styles.row}>
              <Text>Provident Fund (PF)</Text>
              <Text>{formatMoney(payslip.pf, company.currency)}</Text>
            </View>
            <View style={styles.row}>
              <Text>ESI</Text>
              <Text>{formatMoney(payslip.esi, company.currency)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Professional Tax</Text>
              <Text>{formatMoney(payslip.professionalTax, company.currency)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Other Deductions</Text>
              <Text>{formatMoney(payslip.otherDeductions, company.currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Total Deductions</Text>
              <Text>{formatMoney(payslip.totalDeductions, company.currency)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.netSalaryBox}>
          <Text style={styles.netSalaryLabel}>Net Salary</Text>
          <Text style={styles.netSalaryValue}>{formatMoney(payslip.netSalary, company.currency)}</Text>
        </View>

        <Text style={styles.footer}>
          This is a system-generated payslip and does not require a signature.
        </Text>
      </Page>
    </Document>
  )
}

export async function buildPayslipPdf(payslip: PayslipData, company: CompanyInfo) {
  return renderToBuffer(<PayslipDocument payslip={payslip} company={company} />)
}

type PayrollListRow = {
  month: number
  year: number
  basic: number
  grossEarnings: number
  totalDeductions: number
  netSalary: number
  status: string
  employee: { employeeCode: string; firstName: string; lastName: string; department: { name: string } | null }
}

const COLUMNS = [
  { header: "Employee Code", key: "employeeCode", width: 16 },
  { header: "Name", key: "name", width: 24 },
  { header: "Department", key: "department", width: 18 },
  { header: "Month", key: "month", width: 14 },
  { header: "Basic", key: "basic", width: 14 },
  { header: "Gross", key: "gross", width: 14 },
  { header: "Deductions", key: "deductions", width: 14 },
  { header: "Net Salary", key: "net", width: 14 },
  { header: "Status", key: "status", width: 12 },
]

export async function buildPayrollExcel(rows: PayrollListRow[]) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "EMS"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet("Payroll")
  sheet.columns = COLUMNS
  sheet.getRow(1).font = { bold: true }

  for (const r of rows) {
    sheet.addRow({
      employeeCode: r.employee.employeeCode,
      name: `${r.employee.firstName} ${r.employee.lastName}`,
      department: r.employee.department?.name ?? "—",
      month: `${MONTH_NAMES[r.month - 1]} ${r.year}`,
      basic: r.basic,
      gross: r.grossEarnings,
      deductions: r.totalDeductions,
      net: r.netSalary,
      status: r.status,
    })
  }

  return workbook.xlsx.writeBuffer()
}
