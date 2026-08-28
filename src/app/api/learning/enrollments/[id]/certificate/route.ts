import { NextRequest, NextResponse } from "next/server"

import { apiError } from "@/lib/api-response"
import { ValidationError } from "@/lib/errors"
import { requireSession } from "@/features/auth/session"
import { getEnrollment } from "@/features/learning/queries"
import { buildCertificatePdf } from "@/features/learning/export"
import { getCompanySettings } from "@/features/settings/queries"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const enrollment = await getEnrollment(id, session)
    if (enrollment.status !== "COMPLETED" || !enrollment.certificateIssuedAt) {
      throw new ValidationError("This course hasn't been completed yet")
    }

    const company = await getCompanySettings()
    const buffer = await buildCertificatePdf(
      {
        employeeName: `${enrollment.employee.firstName} ${enrollment.employee.lastName}`,
        courseTitle: enrollment.course.title,
        completedAt: enrollment.certificateIssuedAt,
        quizScore: enrollment.quizScore,
      },
      { companyName: company.companyName }
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="certificate-${enrollment.course.title.replace(/\s+/g, "-")}.pdf"`,
      },
    })
  } catch (error) {
    return apiError(error)
  }
}
