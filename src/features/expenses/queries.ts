import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canActAsHr, canViewExpenseClaim, canViewTeamExpenses } from "@/features/expenses/authorization"
import type { ExpenseListQuery } from "@/features/expenses/schemas"

const claimInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, reportingManagerId: true, profilePhotoUrl: true } },
  manager: { select: { id: true, firstName: true, lastName: true } },
  hr: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ExpenseClaimInclude

export async function listExpenseClaims(query: ExpenseListQuery, viewer: AccessTokenPayload) {
  const where: Prisma.ExpenseClaimWhereInput = {}

  if (query.status) where.status = query.status
  if (query.category) where.category = query.category

  switch (query.scope) {
    case "mine": {
      if (!viewer.employeeId) return []
      where.employeeId = viewer.employeeId
      break
    }
    case "team-pending": {
      if (viewer.role !== "MANAGER") throw new ForbiddenError()
      where.status = "PENDING"
      where.employee = { reportingManagerId: viewer.employeeId }
      break
    }
    case "hr-pending": {
      if (!canActAsHr(viewer.role)) throw new ForbiddenError()
      where.status = { in: ["PENDING", "MANAGER_APPROVED", "APPROVED"] }
      break
    }
    case "all": {
      if (!canViewTeamExpenses(viewer.role)) throw new ForbiddenError()
      if (viewer.role === "MANAGER") where.employee = { reportingManagerId: viewer.employeeId }
      if (query.employeeId) where.employeeId = query.employeeId
      break
    }
  }

  return prisma.expenseClaim.findMany({
    where,
    include: claimInclude,
    orderBy: { createdAt: "desc" },
  })
}

export async function getExpenseClaimDetail(id: string, viewer: AccessTokenPayload) {
  const claim = await prisma.expenseClaim.findUnique({ where: { id }, include: claimInclude })
  if (!claim) throw new NotFoundError("Expense claim not found")
  if (!canViewExpenseClaim(viewer, claim)) throw new ForbiddenError()
  return claim
}

export async function getExpenseReceiptForDownload(id: string, viewer: AccessTokenPayload) {
  const claim = await prisma.expenseClaim.findUnique({
    where: { id },
    select: { employeeId: true, receiptUrl: true, receiptName: true, employee: { select: { reportingManagerId: true } } },
  })
  if (!claim) throw new NotFoundError("Expense claim not found")
  if (!canViewExpenseClaim(viewer, claim)) throw new ForbiddenError()
  if (!claim.receiptUrl || !claim.receiptName) throw new NotFoundError("No receipt attached to this claim")
  return { receiptUrl: claim.receiptUrl, receiptName: claim.receiptName }
}
