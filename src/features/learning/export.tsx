import "server-only"

import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer"
import { format } from "date-fns"

type CertificateData = {
  employeeName: string
  courseTitle: string
  completedAt: Date
  quizScore: number | null
}

type CompanyInfo = {
  companyName: string
}

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  border: {
    borderWidth: 3,
    borderColor: "#111",
    padding: 40,
    width: "100%",
    height: "100%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { fontSize: 12, color: "#666", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 28, fontWeight: 700, marginTop: 12, marginBottom: 24 },
  presentedTo: { fontSize: 11, color: "#666" },
  name: { fontSize: 22, fontWeight: 700, marginTop: 8, marginBottom: 24 },
  body: { fontSize: 12, textAlign: "center", marginBottom: 4 },
  course: { fontSize: 16, fontWeight: 700, marginTop: 8, marginBottom: 24 },
  meta: { fontSize: 10, color: "#666", marginTop: 24 },
  company: { fontSize: 12, fontWeight: 700, marginTop: 32 },
})

function CertificateDocument({ data, company }: { data: CertificateData; company: CompanyInfo }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <Text style={styles.eyebrow}>Certificate of Completion</Text>
          <Text style={styles.title}>{company.companyName}</Text>
          <Text style={styles.presentedTo}>This certifies that</Text>
          <Text style={styles.name}>{data.employeeName}</Text>
          <Text style={styles.body}>has successfully completed the training</Text>
          <Text style={styles.course}>{data.courseTitle}</Text>
          {data.quizScore != null && <Text style={styles.body}>Assessment score: {data.quizScore}%</Text>}
          <Text style={styles.meta}>Completed on {format(data.completedAt, "dd MMMM yyyy")}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function buildCertificatePdf(data: CertificateData, company: CompanyInfo) {
  return renderToBuffer(<CertificateDocument data={data} company={company} />)
}
