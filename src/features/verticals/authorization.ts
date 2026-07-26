import type { Role } from "@prisma/client"

import { canManageSettings } from "@/features/settings/authorization"

export function canManageVerticals(role: Role) {
  return canManageSettings(role)
}
