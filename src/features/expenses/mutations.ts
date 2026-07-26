import "server-only"

import { prisma } from "@/lib/prisma"
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { recordAuditLog } from "@/lib/audit"
import { sendMail, portalNotificationEmailTemplate } from "@/lib/mail"
import { getEnv } from "@/config/env"
import { saveUploadedFile, assertAllowedFile, ALLOWED_DOCUMENT_MIME_TYPES } from "@/lib/storage"
import type { AccessTokenPayload } from "@/lib/jwt"
import { canActAsHr, canActAsManager } from "@/features/expenses/authorization"
import type { ExpenseClaimFormInput, ExpenseActionInput } from "@/features/expenses/schemas"

type Meta = { ipAddress?: string | null; userAgent?: string | null }

async function notifyUser(userId: string, employeeId: string | null, title: string, message: string, link: string) {
  try {
    await prisma.notification.create({
      data: { userId, employeeId, type: "INFO", title, message, link },
    })
  } catch (error) {
    console.error("Failed to create notification:", error)
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, isActive: true } })
    if (user?.isActive) {
      const actionUrl = `${getEnv().NEXT_PUBLIC_APP_URL}${link}`
      await sendMail({ to: user.email, ...portalNotificationEmailTemplate(title, message, actionUrl) })
    }
  } catch (error) {
    console.error("Failed to send expense notification email:", error)
  }
}

async function notifyHrUsers(title: string, message: string, link: string) {
  const hrUsers = await prisma.user.findMany({
    where: { role: { in: ["HR", "SUPER_ADMIN"] }, isActive: true },
    select: { id: true, employee: { select: { id: true } } },
  })
  await Promise.all(hrUsers.map((u) => notifyUser(u.id, u.employee?.id ?? null, title, message, link)))
}

export async function submitExpenseClaim(
  input: ExpenseClaimFormInput,
  receiptFile: File | null,
  viewer: AccessTokenPayload,
  meta: Meta
) {
  if (!viewer.employeeId) throw new ValidationError("Your account isn't linked to an employee profile yet")

  const employee = await prisma.employee.findUnique({
    where: { id: viewer.employeeId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, reportingManagerId: true },
  })
  if (!employee) throw new NotFoundError("Employee not found")

  let receiptUrl: string | null = null
  let receiptName: string | null = null
  if (receiptFile) {
    assertAllowedFile(receiptFile, ALLOWED_DOCUMENT_MIME_TYPES)
    const buffer = Buffer.from(await receiptFile.arrayBuffer())
    const { relativePath } = await saveUploadedFile(buffer, `expenses/${employee.id}`, receiptFile.name)
    receiptUrl = relativePath
    receiptName = receiptFile.name
  }

  const claim = await prisma.expenseClaim.create({
    data: {
      employeeId: employee.id,
      category: input.category,
      title: input.title,
      description: input.description || null,
      amount: Number(input.amount),
      expenseDate: new Date(input.expenseDate),
      receiptUrl,
      receiptName,
      status: "PENDING",
    },
  })

  const applicantName = `${employee.firstName} ${employee.lastName}`
  if (employee.reportingManagerId) {
    const manager = await prisma.employee.findUnique({
      where: { id: employee.reportingManagerId },
      select: { userId: true, id: true },
    })
    if (manager?.userId) {
      await notifyUser(
        manager.userId,
        manager.id,
        "Expense claim awaiting your approval",
        `${applicantName} submitted a ${input.title} claim for ${Number(input.amount).toFixed(2)}.`,
        "/expenses?tab=approvals"
      )
    }
  } else {
    await notifyHrUsers(
      "Expense claim awaiting approval",
      `${applicantName} submitted a ${input.title} claim and has no assigned manager.`,
      "/expenses?tab=approvals"
    )
  }

  await recordAuditLog({
    userId: viewer.sub,
    action: "EXPENSE_SUBMITTED",
    entityType: "ExpenseClaim",
    entityId: claim.id,
    ...meta,
  })

  return claim
}

export async function managerAction(id: string, input: ExpenseActionInput, viewer: AccessTokenPayload, meta: Meta) {
  const claim = await prisma.expenseClaim.findUnique({ where: { id }, include: { employee: true } })
  if (!claim) throw new NotFoundError("Expense claim not found")
  if (!canActAsManager(viewer, claim)) throw new ForbiddenError()
  if (claim.status !== "PENDING") {
    throw new ValidationError("This claim has already been actioned")
  }

  const managerEmployeeId = viewer.employeeId ?? null

  const updated = await prisma.expenseClaim.update({
    where: { id },
    data: {
      status: input.action === "APPROVE" ? "MANAGER_APPROVED" : "REJECTED",
      managerId: managerEmployeeId,
      managerActionAt: new Date(),
      managerComment: input.comment || null,
    },
  })

  const employeeName = `${claim.employee.firstName} ${claim.employee.lastName}`

  if (input.action === "APPROVE") {
    await notifyHrUsers(
      "Expense claim awaiting final approval",
      `${employeeName}'s ${claim.title} claim was approved by their manager and needs HR sign-off.`,
      "/expenses?tab=approvals"
    )
  } else if (claim.employee.userId) {
    await notifyUser(
      claim.employee.userId,
      claim.employeeId,
      "Expense claim rejected",
      `Your ${claim.title} claim was rejected by your manager.`,
      "/expenses"
    )
  }

  await recordAuditLog({
    userId: viewer.sub,
    action: input.action === "APPROVE" ? "EXPENSE_MANAGER_APPROVED" : "EXPENSE_MANAGER_REJECTED",
    entityType: "ExpenseClaim",
    entityId: id,
    ...meta,
  })

  return updated
}

export async function hrAction(id: string, input: ExpenseActionInput, viewer: AccessTokenPayload, meta: Meta) {
  if (!canActAsHr(viewer.role)) throw new ForbiddenError()

  const claim = await prisma.expenseClaim.findUnique({ where: { id }, include: { employee: true } })
  if (!claim) throw new NotFoundError("Expense claim not found")
  if (claim.status !== "PENDING" && claim.status !== "MANAGER_APPROVED") {
    throw new ValidationError("This claim has already been actioned")
  }

  const hrEmployeeId = viewer.employeeId ?? null
  const approving = input.action === "APPROVE"

  const updated = await prisma.expenseClaim.update({
    where: { id },
    data: {
      status: approving ? "APPROVED" : "REJECTED",
      hrId: hrEmployeeId,
      hrActionAt: new Date(),
      hrComment: input.comment || null,
    },
  })

  if (claim.employee.userId) {
    await notifyUser(
      claim.employee.userId,
      claim.employeeId,
      approving ? "Expense claim approved" : "Expense claim rejected",
      approving
        ? `Your ${claim.title} claim (${Number(claim.amount).toFixed(2)}) has been approved and is awaiting reimbursement.`
        : `Your ${claim.title} claim was rejected by HR.`,
      "/expenses"
    )
  }

  await recordAuditLog({
    userId: viewer.sub,
    action: approving ? "EXPENSE_HR_APPROVED" : "EXPENSE_HR_REJECTED",
    entityType: "ExpenseClaim",
    entityId: id,
    ...meta,
  })

  return updated
}

export async function markExpenseReimbursed(id: string, viewer: AccessTokenPayload, meta: Meta) {
  if (!canActAsHr(viewer.role)) throw new ForbiddenError()

  const claim = await prisma.expenseClaim.findUnique({ where: { id }, include: { employee: true } })
  if (!claim) throw new NotFoundError("Expense claim not found")
  if (claim.status !== "APPROVED") throw new ValidationError("Only approved claims can be marked as reimbursed")

  const updated = await prisma.expenseClaim.update({
    where: { id },
    data: { status: "REIMBURSED", reimbursedAt: new Date() },
  })

  if (claim.employee.userId) {
    await notifyUser(
      claim.employee.userId,
      claim.employeeId,
      "Expense claim reimbursed",
      `Your ${claim.title} claim (${Number(claim.amount).toFixed(2)}) has been reimbursed.`,
      "/expenses"
    )
  }

  await recordAuditLog({
    userId: viewer.sub,
    action: "EXPENSE_REIMBURSED",
    entityType: "ExpenseClaim",
    entityId: id,
    ...meta,
  })

  return updated
}

export async function cancelExpenseClaim(id: string, viewer: AccessTokenPayload, meta: Meta) {
  const claim = await prisma.expenseClaim.findUnique({ where: { id } })
  if (!claim) throw new NotFoundError("Expense claim not found")
  if (claim.employeeId !== viewer.employeeId) throw new ForbiddenError()
  if (!["PENDING", "MANAGER_APPROVED"].includes(claim.status)) {
    throw new ValidationError("This claim can no longer be cancelled")
  }

  await prisma.expenseClaim.update({ where: { id }, data: { status: "CANCELLED" } })

  await recordAuditLog({
    userId: viewer.sub,
    action: "EXPENSE_CANCELLED",
    entityType: "ExpenseClaim",
    entityId: id,
    ...meta,
  })
}
