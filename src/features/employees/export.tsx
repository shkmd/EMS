import "server-only"

import ExcelJS from "exceljs"
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer"
import { format } from "date-fns"

type ExportEmployee = {
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  mobile: string
  employmentType: string
  status: string
  dateOfJoining: Date
  department: { name: string } | null
  designation: { title: string } | null
}

const COLUMNS = [
  { header: "Employee Code", key: "employeeCode", width: 16 },
  { header: "Name", key: "name", width: 24 },
  { header: "Email", key: "email", width: 28 },
  { header: "Mobile", key: "mobile", width: 16 },
  { header: "Department", key: "department", width: 18 },
  { header: "Designation", key: "designation", width: 22 },
  { header: "Employment Type", key: "employmentType", width: 16 },
  { header: "Status", key: "status", width: 12 },
  { header: "Date of Joining", key: "dateOfJoining", width: 16 },
]

function toRow(e: ExportEmployee) {
  return {
    employeeCode: e.employeeCode,
    name: `${e.firstName} ${e.lastName}`,
    email: e.email,
    mobile: e.mobile,
    department: e.department?.name ?? "—",
    designation: e.designation?.title ?? "—",
    employmentType: e.employmentType.replace("_", " "),
    status: e.status,
    dateOfJoining: format(e.dateOfJoining, "dd MMM yyyy"),
  }
}

export async function buildEmployeesExcelBuffer(employees: ExportEmployee[]) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "EMS"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet("Employees")
  sheet.columns = COLUMNS
  sheet.getRow(1).font = { bold: true }

  for (const employee of employees) {
    sheet.addRow(toRow(employee))
  }

  return workbook.xlsx.writeBuffer()
}

const pdfStyles = StyleSheet.create({
  page: { padding: 24, fontSize: 8 },
  title: { fontSize: 14, marginBottom: 12, fontWeight: 700 },
  table: { display: "flex", flexDirection: "column", width: "100%" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e5e5", paddingVertical: 4 },
  headerRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: "#111", paddingBottom: 4, fontWeight: 700 },
  cell: { flex: 1, paddingRight: 4 },
})

function EmployeesPdfDocument({ employees }: { employees: ExportEmployee[] }) {
  const rows = employees.map(toRow)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>Employee List</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.headerRow}>
            {COLUMNS.map((col) => (
              <Text key={col.key} style={pdfStyles.cell}>
                {col.header}
              </Text>
            ))}
          </View>
          {rows.map((row, index) => (
            <View key={index} style={pdfStyles.row}>
              {COLUMNS.map((col) => (
                <Text key={col.key} style={pdfStyles.cell}>
                  {String(row[col.key as keyof typeof row])}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

export async function buildEmployeesPdfBuffer(employees: ExportEmployee[]) {
  return renderToBuffer(<EmployeesPdfDocument employees={employees} />)
}
