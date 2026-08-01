import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { deleteChecklistItem, updateChecklistItem } from "@/features/projects/mutations"
import { checklistItemUpdateSchema } from "@/features/projects/schemas"

type RouteParams = { params: Promise<{ itemId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { itemId } = await params
    const body = checklistItemUpdateSchema.parse(await req.json())

    const item = await updateChecklistItem(itemId, body, session)
    return apiSuccess({ item }, "Checklist item updated")
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession()
    const { itemId } = await params

    await deleteChecklistItem(itemId, session)
    return apiSuccess(null, "Checklist item deleted")
  } catch (error) {
    return apiError(error)
  }
}
