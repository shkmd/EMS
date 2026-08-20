import "server-only"

import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"

/** Vertical IDs this employee is an appointed manager of. Empty for anyone
 * who isn't a vertical manager (most employees, and managers not assigned
 * to any vertical). */
export async function getManagedVerticalIds(viewer: AccessTokenPayload): Promise<string[]> {
  if (!viewer.employeeId) return []
  const employee = await prisma.employee.findUnique({
    where: { id: viewer.employeeId },
    select: { managedVerticals: { select: { id: true } } },
  })
  return employee?.managedVerticals.map((v) => v.id) ?? []
}

/** Vertical IDs visible to this viewer: their own vertical plus any they
 * manage. Returns null for SUPER_ADMIN/HR, meaning unrestricted — every
 * vertical is visible to them. Used to scope Projects, where visibility
 * isn't otherwise tied to the reporting-manager hierarchy. */
export async function getVisibleVerticalIds(viewer: AccessTokenPayload): Promise<string[] | null> {
  if (viewer.role === "SUPER_ADMIN" || viewer.role === "HR") return null
  if (!viewer.employeeId) return []

  const employee = await prisma.employee.findUnique({
    where: { id: viewer.employeeId },
    select: { verticalId: true, managedVerticals: { select: { id: true } } },
  })
  if (!employee) return []

  const ids = new Set<string>()
  if (employee.verticalId) ids.add(employee.verticalId)
  employee.managedVerticals.forEach((v) => ids.add(v.id))
  return Array.from(ids)
}

/** Throws unless the given vertical is within the viewer's visible set
 * (their own vertical, one they manage, or they're HR/SUPER_ADMIN). A null
 * verticalId (an unassigned project) is only visible to HR/SUPER_ADMIN. */
export async function assertVerticalVisible(viewer: AccessTokenPayload, verticalId: string | null) {
  const visible = await getVisibleVerticalIds(viewer)
  if (visible === null) return
  if (!verticalId || !visible.includes(verticalId)) throw new ForbiddenError()
}
