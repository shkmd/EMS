import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { ValidationError } from "@/lib/errors"
import { getClientIp } from "@/lib/rate-limit"
import { updateDocumentTemplate, resetDocumentTemplate } from "@/features/hr-documents/mutations"
import { updateDocumentTemplateSchema } from "@/features/hr-documents/schemas"
import { templateTypeValues, type TemplateType } from "@/features/hr-documents/templates"

function assertValidType(type: string): asserts type is TemplateType {
  if (!templateTypeValues.includes(type as TemplateType)) {
    throw new ValidationError("Unknown document template type")
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const session = await requireSession()
    const { type } = await params
    assertValidType(type)
    const body = updateDocumentTemplateSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const template = await updateDocumentTemplate(type, body, session, meta)
    return apiSuccess({ template }, "Template updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const session = await requireSession()
    const { type } = await params
    assertValidType(type)
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await resetDocumentTemplate(type, session, meta)
    return apiSuccess(null, "Template reset to default")
  } catch (error) {
    return apiError(error)
  }
}
