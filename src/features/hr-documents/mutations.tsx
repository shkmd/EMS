import "server-only"

import { renderToBuffer } from "@react-pdf/renderer"
import { format } from "date-fns"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import { saveUploadedFile, deleteUploadedFile, assertAllowedFile, ALLOWED_PHOTO_MIME_TYPES } from "@/lib/storage"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canManageEmployees } from "@/features/employees/authorization"
import { getCompanySettings } from "@/features/settings/queries"
import { getCompanyLetterheadInfo, toDataUri } from "@/features/hr-documents/pdf/shared"
import { GenericDocument } from "@/features/hr-documents/pdf/generic-document"
import { getEffectiveTemplate } from "@/features/hr-documents/queries"
import { renderTemplateText, DEFAULT_TEMPLATES, IMAGE_PLACEHOLDER_DATA, type TemplateType } from "@/features/hr-documents/templates"
import type { GenerateEmployeeDocumentInput, OfferLetterInput, UpdateDocumentTemplateInput } from "@/features/hr-documents/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

const FILE_NAME_PREFIX: Record<string, string> = {
  RELIEVING_LETTER: "relieving-letter",
  EXPERIENCE_CERTIFICATE: "experience-certificate",
  SALARY_CERTIFICATE: "salary-certificate",
}

function formatMoney(n: number, currency: string) {
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function assertCanManage(viewer: AccessTokenPayload) {
  if (!canManageEmployees(viewer.role)) throw new ForbiddenError()
}

export async function generateEmployeeDocument(
  employeeId: string,
  input: GenerateEmployeeDocumentInput,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  assertCanManage(viewer)

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId, deletedAt: null },
    include: { designation: true, department: true },
  })
  if (!employee) throw new NotFoundError("Employee not found")

  const [company, companySettings, template] = await Promise.all([
    getCompanyLetterheadInfo(),
    getCompanySettings(),
    getEffectiveTemplate(input.type),
  ])

  const common = {
    employeeName: `${employee.firstName} ${employee.lastName}`,
    employeeFirstName: employee.firstName,
    employeeCode: employee.employeeCode,
    designation: employee.designation?.title ?? "an employee",
    departmentClause: employee.department ? ` in the ${employee.department.name} department` : "",
    dateOfJoining: format(employee.dateOfJoining, "dd MMMM yyyy"),
    companyName: company.companyName,
    currentDate: format(new Date(), "dd MMMM yyyy"),
    ...IMAGE_PLACEHOLDER_DATA,
  }

  let data: Record<string, string>

  if (input.type === "RELIEVING_LETTER") {
    const offboarding = await prisma.offboarding.findFirst({ where: { employeeId }, orderBy: { createdAt: "desc" } })
    if (!offboarding) {
      throw new ValidationError(
        "This employee has no offboarding record — initiate offboarding first to generate a relieving letter"
      )
    }
    data = { ...common, lastWorkingDay: format(offboarding.lastWorkingDay, "dd MMMM yyyy") }
  } else if (input.type === "EXPERIENCE_CERTIFICATE") {
    const offboarding = await prisma.offboarding.findFirst({
      where: { employeeId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    })
    const tenureClause = offboarding
      ? `from ${common.dateOfJoining} to ${format(offboarding.lastWorkingDay, "dd MMMM yyyy")}`
      : `since ${common.dateOfJoining}`
    data = { ...common, tenureClause }
  } else {
    const basic = employee.basicSalary ? Number(employee.basicSalary) : null
    const allowances = employee.allowances ? Number(employee.allowances) : 0
    const gross = basic != null ? basic + allowances : null
    data = {
      ...common,
      basicSalary: basic != null ? formatMoney(basic, companySettings.currency) : "—",
      grossSalary: gross != null ? formatMoney(gross, companySettings.currency) : "—",
    }
  }

  const title = renderTemplateText(template.title, data)
  const bodyText = renderTemplateText(template.bodyText, data)
  const imageDataUri = await toDataUri(template.imageUrl, "template image")
  const buffer = await renderToBuffer(
    <GenericDocument title={title} bodyText={bodyText} company={company} imageDataUri={imageDataUri} />
  )

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
  assertCanManage(viewer)

  const [company, companySettings, template] = await Promise.all([
    getCompanyLetterheadInfo(),
    getCompanySettings(),
    getEffectiveTemplate("OFFER_LETTER"),
  ])

  const department = input.departmentId
    ? await prisma.department.findUnique({ where: { id: input.departmentId } })
    : null

  const data: Record<string, string> = {
    candidateName: input.candidateName,
    position: input.position,
    departmentClause: department ? ` in the ${department.name} department` : "",
    proposedSalary: formatMoney(Number(input.proposedSalary), companySettings.currency),
    joiningDate: format(new Date(input.joiningDate), "dd MMMM yyyy"),
    validUntilClause: input.validUntil ? ` This offer is valid until ${format(new Date(input.validUntil), "dd MMMM yyyy")}.` : "",
    companyName: company.companyName,
    currentDate: format(new Date(), "dd MMMM yyyy"),
    ...IMAGE_PLACEHOLDER_DATA,
  }

  const title = renderTemplateText(template.title, data)
  const bodyText = renderTemplateText(template.bodyText, data)
  const imageDataUri = await toDataUri(template.imageUrl, "template image")
  const buffer = await renderToBuffer(
    <GenericDocument title={title} bodyText={bodyText} company={company} imageDataUri={imageDataUri} />
  )
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

export async function updateDocumentTemplate(
  type: TemplateType,
  input: UpdateDocumentTemplateInput,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  assertCanManage(viewer)

  const template = await prisma.documentTemplate.upsert({
    where: { type },
    update: { title: input.title, bodyText: input.bodyText, updatedById: viewer.sub },
    create: { type, title: input.title, bodyText: input.bodyText, updatedById: viewer.sub },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "DOCUMENT_TEMPLATE_UPDATED",
    entityType: "DocumentTemplate",
    entityId: template.id,
    metadata: { type },
    ...meta,
  })

  return template
}

export async function resetDocumentTemplate(type: TemplateType, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.documentTemplate.findUnique({ where: { type } })
  if (existing?.imageUrl) await deleteUploadedFile(existing.imageUrl)

  await prisma.documentTemplate.deleteMany({ where: { type } })

  await recordAuditLog({
    userId: viewer.sub,
    action: "DOCUMENT_TEMPLATE_RESET",
    entityType: "DocumentTemplate",
    metadata: { type },
    ...meta,
  })
}

export async function uploadTemplateImage(type: TemplateType, file: File, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  assertAllowedFile(file, ALLOWED_PHOTO_MIME_TYPES)
  const buffer = Buffer.from(await file.arrayBuffer())
  const { relativePath } = await saveUploadedFile(buffer, `document-templates/${type}`, file.name)

  const existing = await prisma.documentTemplate.findUnique({ where: { type } })
  if (existing?.imageUrl) await deleteUploadedFile(existing.imageUrl)

  const textFields = existing ? { title: existing.title, bodyText: existing.bodyText } : DEFAULT_TEMPLATES[type]

  const template = await prisma.documentTemplate.upsert({
    where: { type },
    update: { imageUrl: relativePath, updatedById: viewer.sub },
    create: { type, imageUrl: relativePath, updatedById: viewer.sub, ...textFields },
  })

  await recordAuditLog({
    userId: viewer.sub,
    action: "DOCUMENT_TEMPLATE_IMAGE_UPDATED",
    entityType: "DocumentTemplate",
    entityId: template.id,
    metadata: { type },
    ...meta,
  })

  return template
}

export async function deleteTemplateImage(type: TemplateType, viewer: AccessTokenPayload, meta: Meta) {
  assertCanManage(viewer)

  const existing = await prisma.documentTemplate.findUnique({ where: { type } })
  if (!existing?.imageUrl) return

  await deleteUploadedFile(existing.imageUrl)
  await prisma.documentTemplate.update({ where: { type }, data: { imageUrl: null } })

  await recordAuditLog({
    userId: viewer.sub,
    action: "DOCUMENT_TEMPLATE_IMAGE_REMOVED",
    entityType: "DocumentTemplate",
    entityId: existing.id,
    metadata: { type },
    ...meta,
  })
}
