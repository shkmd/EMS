import { NextRequest } from "next/server"

import { requireSession } from "@/features/auth/session"
import { apiError, apiSuccess } from "@/lib/api-response"
import { getClientIp } from "@/lib/rate-limit"
import { recordPermissionForEmployee } from "@/features/permission/mutations"
import { recordPermissionSchema } from "@/features/permission/schemas"

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = recordPermissionSchema.parse(await req.json())
    const meta = { ipAddress: getClientIp(req.headers), userAgent: req.headers.get("user-agent") }

    const request = await recordPermissionForEmployee(body, session, meta)
    return apiSuccess({ request }, "Permission request recorded", 201)
  } catch (error) {
    return apiError(error)
  }
}
