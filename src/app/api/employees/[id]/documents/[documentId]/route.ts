import { NextRequest, NextResponse } from "next/server"

import { apiError } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { readUploadedFile } from "@/lib/storage"
import { getEmployeeDocumentForDownload, deleteEmployeeDocument } from "@/features/employees/mutations"
import { apiSuccess } from "@/lib/api-response"

type RouteParams = { params: Promise<{ id: string; documentId: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id, documentId } = await params

    const document = await getEmployeeDocumentForDownload(id, documentId, session)
    const buffer = await readUploadedFile(document.fileUrl)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.fileName)}"`,
        "Content-Length": String(document.fileSize),
      },
    })
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { id, documentId } = await params
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    await deleteEmployeeDocument(id, documentId, session, meta)
    return apiSuccess(null, "Document deleted")
  } catch (error) {
    return apiError(error)
  }
}
