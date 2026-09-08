import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { requireSession } from "@/features/auth/session"
import { listPermissionRequests } from "@/features/permission/queries"
import { applyPermission } from "@/features/permission/mutations"
import { applyPermissionSchema, permissionListQuerySchema } from "@/features/permission/schemas"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const query = permissionListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const requests = await listPermissionRequests(query, session)
    return apiSuccess({ requests })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = applyPermissionSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const request = await applyPermission(body, session, meta)
    return apiSuccess({ request }, "Permission request submitted", 201)
  } catch (error) {
    return apiError(error)
  }
}
