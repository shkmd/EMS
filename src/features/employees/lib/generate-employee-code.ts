import { prisma } from "@/lib/prisma"

const PREFIX = "EMP"
const PAD_LENGTH = 5

/**
 * Generates the next sequential employee code (e.g. EMP00001) by reading the
 * highest existing numeric suffix. Called from within a transaction by
 * callers that need to guarantee no duplicate is issued under concurrent
 * writes.
 */
export async function generateNextEmployeeCode() {
  const last = await prisma.employee.findFirst({
    where: { employeeCode: { startsWith: PREFIX } },
    orderBy: { employeeCode: "desc" },
    select: { employeeCode: true },
  })

  const lastNumber = last ? Number(last.employeeCode.slice(PREFIX.length)) : 0
  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1

  return `${PREFIX}${String(nextNumber).padStart(PAD_LENGTH, "0")}`
}
