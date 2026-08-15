import "server-only"

import { renderToBuffer } from "@react-pdf/renderer"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import { saveUploadedFile } from "@/lib/storage"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageEmployees } from "@/features/employees/authorization"
import { getCompanySettings } from "@/features/settings/queries"
import { getCompanyLetterheadInfo } from "@/features/hr-documents/pdf/shared"
import { RelievingLetterDocument, type RelievingLetterData } from "@/features/hr-documents/pdf/relieving-letter"
import { ExperienceCertificateDocument, type ExperienceCertificateData } from "@/features/hr-documents/pdf/experience-certificate"
import { SalaryCertificateDocument, type SalaryCertificateData } from "@/features/hr-documents/pdf/salary-certificate"
import { OfferLetterDocument, type OfferLetterData } from "@/features/hr-documents/pdf/offer-letter"
import type { GenerateEmployeeDocumentInput, OfferLetterInput } from "@/features/hr-documents/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

const FILE_NAME_PREFIX: Record<string, string> = {
  RELIEVING_LETTER: "relieving-letter",
  EXPERIENCE_CERTIFICATE: "experience-certificate",
  SALARY_CERTIFICATE: "salary-certificate",
}

export async function generateEmployeeDocument(
  employeeId: string,
  input: GenerateEmployeeDocumentInput,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  if (!canManageEmployees(viewer.role)) throw new ForbiddenError()

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId, deletedAt: null },
    include: { designation: true, department: true },
  })
  if (!employee) throw new NotFoundError("Employee not found")

  const [company, companySettings] = await Promise.all([getCompanyLetterheadInfo(), getCompanySettings()])

  let buffer: Buffer

  if (input.type === "RELIEVING_LETTER") {
    const offboarding = await prisma.offboarding.findFirst({ where: { employeeId }, orderBy: { createdAt: "desc" } })
    if (!offboarding) {
      throw new ValidationError(
        "This employee has no offboarding record — initiate offboarding first to generate a relieving letter"
      )
    }
    const data: RelievingLetterData = {
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeCode: employee.employeeCode,
      designationTitle: employee.designation?.title ?? null,
      departmentName: employee.department?.name ?? null,
      dateOfJoining: employee.dateOfJoining,
      lastWorkingDay: offboarding.lastWorkingDay,
    }
    buffer = await renderToBuffer(<RelievingLetterDocument data={data} company={company} />)
  } else if (input.type === "EXPERIENCE_CERTIFICATE") {
    const offboarding = await prisma.offboarding.findFirst({
      where: { employeeId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    })
    const data: ExperienceCertificateData = {
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeCode: employee.employeeCode,
      designationTitle: employee.designation?.title ?? null,
      departmentName: employee.department?.name ?? null,
      dateOfJoining: employee.dateOfJoining,
      lastWorkingDay: offboarding?.lastWorkingDay ?? null,
    }
    buffer = await renderToBuffer(<ExperienceCertificateDocument data={data} company={company} />)
  } else {
    const basic = employee.basicSalary ? Number(employee.basicSalary) : null
    const allowances = employee.allowances ? Number(employee.allowances) : 0
    const data: SalaryCertificateData = {
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeCode: employee.employeeCode,
      designationTitle: employee.designation?.title ?? null,
      departmentName: employee.department?.name ?? null,
      dateOfJoining: employee.dateOfJoining,
      basicSalary: basic,
      grossSalary: basic != null ? basic + allowances : null,
      currency: companySettings.currency,
    }
    buffer = await renderToBuffer(<SalaryCertificateDocument data={data} company={company} />)
  }

  const fileName = `${FILE_NAME_PREFIX[input.type]}-${employee.employeeCode}.pdf`
  const { relativePath } = await saveUploadedFile(buffer, `employees/${employeeId}/documents`, fileName)

  const document = await prisma.employeeDocument.create({
    data: {
      employeeId,
      type: input.type,
      fileName,
      fileUrl: relativePath,
      fileSize: buffer.length,
      mimeType: "application/pdf",
    },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "EMPLOYEE_DOCUMENT_GENERATED",
    entityType: "EmployeeDocument",
    entityId: document.id,
    metadata: { employeeId, type: input.type },
    ...meta,
  })

  return { buffer, fileName }
}

export async function generateOfferLetter(input: OfferLetterInput, viewer: AccessTokenPayload, meta: Meta) {
  if (!canManageEmployees(viewer.role)) throw new ForbiddenError()

  const [company, companySettings] = await Promise.all([getCompanyLetterheadInfo(), getCompanySettings()])

  const department = input.departmentId
    ? await prisma.department.findUnique({ where: { id: input.departmentId } })
    : null

  const data: OfferLetterData = {
    candidateName: input.candidateName,
    position: input.position,
    departmentName: department?.name ?? null,
    proposedSalary: Number(input.proposedSalary),
    currency: companySettings.currency,
    joiningDate: new Date(input.joiningDate),
    validUntil: input.validUntil ? new Date(input.validUntil) : null,
  }

  const buffer = await renderToBuffer(<OfferLetterDocument data={data} company={company} />)
  const fileName = `offer-letter-${input.candidateName.replace(/\s+/g, "-").toLowerCase()}.pdf`

  await recordAuditLog({
    userId: viewer.sub,
    action: "OFFER_LETTER_GENERATED",
    entityType: "OfferLetter",
    metadata: { candidateName: input.candidateName, position: input.position },
    ...meta,
  })

  return { buffer, fileName }
}
