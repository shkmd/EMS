import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { addEmployeeNote } from "@/features/employees/mutations"
import { employeeNoteSchema } from "@/features/employees/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = employeeNoteSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const note = await addEmployeeNote(id, body, session, meta)
    return apiSuccess({ note }, "Note added", 201)
  } catch (error) {
    return apiError(error)
  }
}
