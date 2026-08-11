import { PrismaClient, type AttendanceStatus } from "@prisma/client"
import bcrypt from "bcryptjs"
import { subDays, subMonths, isWeekend } from "date-fns"

import { toUtcDateOnly } from "../src/lib/date-only"

const prisma = new PrismaClient()

function atUtcTime(d: Date, hours: number, minutes: number) {
  const utc = toUtcDateOnly(d)
  utc.setUTCHours(hours, minutes, 0, 0)
  return utc
}

const SEED_SUPER_ADMIN_EMAIL = process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@ems.local"
const SEED_SUPER_ADMIN_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "ChangeMe123!"
const DEFAULT_PASSWORD = "Password123!"

// Demo departments/employees/attendance/leave-request data is only for
// bootstrapping a FRESH dev/demo database — this migrate step (and its
// seed) runs on every single deploy, so without this gate, deleting a demo
// department or account in production would just have it silently
// resurrected by the next deploy's upsert-by-name/email (exactly what
// happened here: a customer explicitly removed 6 demo departments and 4
// demo accounts, and the very next deploy brought all of it back). Defaults
// off; set SEED_DEMO_DATA=true only for a brand new environment that wants
// the sample data to start from.
const SEED_DEMO_DATA = process.env.SEED_DEMO_DATA === "true"

async function hash(plain: string) {
  return bcrypt.hash(plain, 12)
}

function employeeCode(n: number) {
  return `EMP${String(n).padStart(5, "0")}`
}

async function main() {
  console.log("Seeding settings...")
  await prisma.companySettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: "Acme Corporation",
      address: "123 Business Park, Bengaluru, India",
      phone: "+91-80-1234-5678",
      email: "hello@acme.example",
      website: "https://acme.example",
      timezone: "Asia/Kolkata",
      currency: "INR",
      dateFormat: "dd MMM yyyy",
    },
  })

  await prisma.workingHoursSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      startTime: "09:00",
      endTime: "18:00",
      workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
      graceMinutes: 10,
      halfDayHours: 4,
      fullDayHours: 8,
    },
  })

  await prisma.emailSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, smtpSecure: true, fromName: "Acme HR", fromEmail: "no-reply@acme.example" },
  })

  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  })

  console.log("Seeding leave types...")
  const leaveTypeDefs = [
    { name: "Casual Leave", code: "CL", defaultDaysPerYear: 12, isPaid: true, carryForward: false },
    { name: "Sick Leave", code: "SL", defaultDaysPerYear: 10, isPaid: true, carryForward: false },
    { name: "Earned Leave", code: "EL", defaultDaysPerYear: 15, isPaid: true, carryForward: true, maxCarryForwardDays: 30 },
    { name: "Loss of Pay", code: "LOP", defaultDaysPerYear: 0, isPaid: false, carryForward: false },
  ]
  const leaveTypes = []
  for (const def of leaveTypeDefs) {
    leaveTypes.push(
      await prisma.leaveType.upsert({ where: { code: def.code }, update: {}, create: def })
    )
  }

  console.log("Seeding holidays...")
  const year = new Date().getFullYear()
  const holidayDefs = [
    { name: "New Year's Day", date: `${year}-01-01`, type: "PUBLIC" as const },
    { name: "Republic Day", date: `${year}-01-26`, type: "PUBLIC" as const },
    { name: "Independence Day", date: `${year}-08-15`, type: "PUBLIC" as const },
    { name: "Gandhi Jayanti", date: `${year}-10-02`, type: "PUBLIC" as const },
    { name: "Christmas", date: `${year}-12-25`, type: "PUBLIC" as const },
    { name: "Founders' Day", date: `${year}-03-15`, type: "COMPANY" as const },
    { name: "Diwali (Optional)", date: `${year}-11-01`, type: "OPTIONAL" as const },
  ]
  for (const def of holidayDefs) {
    await prisma.holiday.upsert({
      where: { name_date: { name: def.name, date: new Date(def.date) } },
      update: {},
      create: { name: def.name, date: new Date(def.date), type: def.type },
    })
  }

  if (!SEED_DEMO_DATA) {
    console.log("Seed complete (SEED_DEMO_DATA not set — skipped demo departments/employees/leave/attendance).")
    return
  }

  console.log("Seeding departments & designations...")
  const departmentDefs = [
    { name: "Engineering", description: "Product engineering and platform teams" },
    { name: "Human Resources", description: "People operations and talent management" },
    { name: "Sales", description: "Revenue and customer acquisition" },
    { name: "Finance", description: "Accounting, payroll and financial planning" },
    { name: "Marketing", description: "Brand, growth and communications" },
  ]
  const departments: Record<string, { id: string }> = {}
  for (const def of departmentDefs) {
    departments[def.name] = await prisma.department.upsert({
      where: { name: def.name },
      update: {},
      create: def,
    })
  }

  const designationDefs = [
    { title: "Software Engineer", department: "Engineering" },
    { title: "Senior Software Engineer", department: "Engineering" },
    { title: "Engineering Manager", department: "Engineering" },
    { title: "HR Executive", department: "Human Resources" },
    { title: "HR Manager", department: "Human Resources" },
    { title: "Sales Executive", department: "Sales" },
    { title: "Sales Manager", department: "Sales" },
    { title: "Financial Analyst", department: "Finance" },
    { title: "Marketing Specialist", department: "Marketing" },
  ]
  const designations: Record<string, { id: string }> = {}
  for (const def of designationDefs) {
    designations[def.title] = await prisma.designation.upsert({
      where: { title_departmentId: { title: def.title, departmentId: departments[def.department]!.id } },
      update: {},
      create: { title: def.title, departmentId: departments[def.department]!.id },
    })
  }

  console.log("Seeding users & employees...")
  const defaultPasswordHash = await hash(DEFAULT_PASSWORD)

  // Super Admin (no employee profile — a pure system account)
  await prisma.user.upsert({
    where: { email: SEED_SUPER_ADMIN_EMAIL },
    update: {},
    create: {
      email: SEED_SUPER_ADMIN_EMAIL,
      password: await hash(SEED_SUPER_ADMIN_PASSWORD),
      role: "SUPER_ADMIN",
    },
  })

  // HR Manager
  const hrUser = await prisma.user.upsert({
    where: { email: "hr.manager@ems.local" },
    update: {},
    create: { email: "hr.manager@ems.local", password: defaultPasswordHash, role: "HR" },
  })
  const hrEmployee = await prisma.employee.upsert({
    where: { email: "hr.manager@ems.local" },
    update: {},
    create: {
      employeeCode: employeeCode(1),
      userId: hrUser.id,
      firstName: "Priya",
      lastName: "Sharma",
      gender: "FEMALE",
      dob: new Date("1988-04-12"),
      mobile: "+91-9800000001",
      email: "hr.manager@ems.local",
      departmentId: departments["Human Resources"]!.id,
      designationId: designations["HR Manager"]!.id,
      employmentType: "FULL_TIME",
      dateOfJoining: new Date("2019-06-01"),
      status: "ACTIVE",
      basicSalary: 90000,
      allowances: 20000,
    },
  })

  // Engineering Manager
  const managerUser = await prisma.user.upsert({
    where: { email: "eng.manager@ems.local" },
    update: {},
    create: { email: "eng.manager@ems.local", password: defaultPasswordHash, role: "MANAGER" },
  })
  const managerEmployee = await prisma.employee.upsert({
    where: { email: "eng.manager@ems.local" },
    update: {},
    create: {
      employeeCode: employeeCode(2),
      userId: managerUser.id,
      firstName: "Arjun",
      lastName: "Mehta",
      gender: "MALE",
      dob: new Date("1985-11-03"),
      mobile: "+91-9800000002",
      email: "eng.manager@ems.local",
      departmentId: departments["Engineering"]!.id,
      designationId: designations["Engineering Manager"]!.id,
      employmentType: "FULL_TIME",
      dateOfJoining: new Date("2018-02-15"),
      status: "ACTIVE",
      basicSalary: 150000,
      allowances: 30000,
    },
  })

  await prisma.department.update({
    where: { name: "Engineering" },
    data: { headId: managerEmployee.id },
  })
  await prisma.department.update({
    where: { name: "Human Resources" },
    data: { headId: hrEmployee.id },
  })

  // Regular employee reporting to the engineering manager
  const employeeUser = await prisma.user.upsert({
    where: { email: "employee@ems.local" },
    update: {},
    create: { email: "employee@ems.local", password: defaultPasswordHash, role: "EMPLOYEE" },
  })
  const employee = await prisma.employee.upsert({
    where: { email: "employee@ems.local" },
    update: {},
    create: {
      employeeCode: employeeCode(3),
      userId: employeeUser.id,
      firstName: "Rahul",
      lastName: "Verma",
      gender: "MALE",
      dob: new Date("1996-07-22"),
      mobile: "+91-9800000003",
      email: "employee@ems.local",
      departmentId: departments["Engineering"]!.id,
      designationId: designations["Software Engineer"]!.id,
      reportingManagerId: managerEmployee.id,
      employmentType: "FULL_TIME",
      dateOfJoining: new Date("2023-01-10"),
      status: "ACTIVE",
      basicSalary: 70000,
      allowances: 15000,
      emergencyContactName: "Sunita Verma",
      emergencyContactRelationship: "Mother",
      emergencyContactPhone: "+91-9800000099",
    },
  })

  // A second regular employee for list/table variety
  const employee2User = await prisma.user.upsert({
    where: { email: "sneha.iyer@ems.local" },
    update: {},
    create: { email: "sneha.iyer@ems.local", password: defaultPasswordHash, role: "EMPLOYEE" },
  })
  const employee2 = await prisma.employee.upsert({
    where: { email: "sneha.iyer@ems.local" },
    update: {},
    create: {
      employeeCode: employeeCode(4),
      userId: employee2User.id,
      firstName: "Sneha",
      lastName: "Iyer",
      gender: "FEMALE",
      dob: new Date("1998-02-18"),
      mobile: "+91-9800000004",
      email: "sneha.iyer@ems.local",
      departmentId: departments["Sales"]!.id,
      designationId: designations["Sales Executive"]!.id,
      employmentType: "FULL_TIME",
      dateOfJoining: new Date("2024-05-20"),
      status: "ACTIVE",
      basicSalary: 55000,
      allowances: 10000,
    },
  })

  console.log("Seeding leave balances...")
  for (const emp of [hrEmployee, managerEmployee, employee, employee2]) {
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: lt.id, year } },
        update: {},
        create: {
          employeeId: emp.id,
          leaveTypeId: lt.id,
          year,
          allocated: lt.defaultDaysPerYear,
          used: 0,
        },
      })
    }
  }

  console.log("Seeding attendance history (last 14 working days)...")
  const attendanceEmployees = [hrEmployee, managerEmployee, employee, employee2]
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const day = subDays(today, i)
    if (isWeekend(day)) continue

    for (const [empIndex, emp] of attendanceEmployees.entries()) {
      const seedVal = (i + empIndex) % 10
      let status: AttendanceStatus
      if (seedVal === 0) status = "ABSENT"
      else if (seedVal === 1) status = "HALF_DAY"
      else if (seedVal <= 3) status = "WORK_FROM_HOME"
      else status = "PRESENT"

      const isAbsent = status === "ABSENT"
      const isHalfDay = status === "HALF_DAY"

      await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: emp.id, date: toUtcDateOnly(day) } },
        update: {},
        create: {
          employeeId: emp.id,
          date: toUtcDateOnly(day),
          status,
          checkIn: isAbsent ? null : atUtcTime(day, 9, 5),
          checkOut: isAbsent ? null : atUtcTime(day, isHalfDay ? 13 : 18, isHalfDay ? 0 : 15),
          workingMinutes: isAbsent ? 0 : isHalfDay ? 235 : 490,
        },
      })
    }
  }

  console.log("Seeding leave requests, timeline event, and announcement...")
  await prisma.leaveRequest.upsert({
    where: { id: "seed-leave-request-1" },
    update: {},
    create: {
      id: "seed-leave-request-1",
      employeeId: employee.id,
      leaveTypeId: leaveTypes.find((l) => l.code === "CL")!.id,
      startDate: new Date(`${year}-09-10`),
      endDate: new Date(`${year}-09-11`),
      days: 2,
      reason: "Family function",
      status: "PENDING",
    },
  })

  await prisma.leaveRequest.upsert({
    where: { id: "seed-leave-request-2" },
    update: {},
    create: {
      id: "seed-leave-request-2",
      employeeId: employee2.id,
      leaveTypeId: leaveTypes.find((l) => l.code === "SL")!.id,
      startDate: subMonths(today, 1),
      endDate: subMonths(today, 1),
      days: 1,
      reason: "Fever",
      status: "APPROVED",
      managerId: null,
      hrId: hrEmployee.id,
      hrActionAt: subMonths(today, 1),
    },
  })

  await prisma.leaveRequest.upsert({
    where: { id: "seed-leave-request-3" },
    update: {},
    create: {
      id: "seed-leave-request-3",
      employeeId: managerEmployee.id,
      leaveTypeId: leaveTypes.find((l) => l.code === "EL")!.id,
      startDate: subMonths(today, 2),
      endDate: subDays(subMonths(today, 2), -4),
      days: 5,
      reason: "Family vacation",
      status: "APPROVED",
      hrId: hrEmployee.id,
      hrActionAt: subMonths(today, 2),
    },
  })

  await prisma.leaveRequest.upsert({
    where: { id: "seed-leave-request-4" },
    update: {},
    create: {
      id: "seed-leave-request-4",
      employeeId: employee.id,
      leaveTypeId: leaveTypes.find((l) => l.code === "SL")!.id,
      startDate: subMonths(today, 1),
      endDate: subMonths(today, 1),
      days: 1,
      reason: "Not feeling well",
      status: "REJECTED",
      managerId: managerEmployee.id,
      managerActionAt: subMonths(today, 1),
      managerComment: "Please provide a medical certificate for approval.",
    },
  })

  await prisma.leaveRequest.upsert({
    where: { id: "seed-leave-request-5" },
    update: {},
    create: {
      id: "seed-leave-request-5",
      employeeId: employee2.id,
      leaveTypeId: leaveTypes.find((l) => l.code === "CL")!.id,
      startDate: subDays(today, -3),
      endDate: subDays(today, -3),
      days: 1,
      reason: "Personal errand",
      status: "MANAGER_APPROVED",
      managerId: managerEmployee.id,
      managerActionAt: subDays(today, 1),
    },
  })

  await prisma.employeeTimelineEvent.create({
    data: {
      employeeId: employee.id,
      type: "JOINED",
      title: "Joined as Software Engineer",
      eventDate: employee.dateOfJoining,
    },
  })

  await prisma.announcement.upsert({
    where: { id: "seed-announcement-1" },
    update: {},
    create: {
      id: "seed-announcement-1",
      title: "Welcome to the new Employee Management System",
      content: "We've rolled out a new HR platform. Explore attendance, leave, and payroll from your dashboard.",
      priority: "NORMAL",
      authorId: hrUser.id,
      isPinned: true,
    },
  })

  console.log("Seed complete.")
  console.log("----------------------------------------------------")
  console.log(`Super Admin login: ${SEED_SUPER_ADMIN_EMAIL} / ${SEED_SUPER_ADMIN_PASSWORD}`)
  console.log(`HR login:          hr.manager@ems.local / ${DEFAULT_PASSWORD}`)
  console.log(`Manager login:     eng.manager@ems.local / ${DEFAULT_PASSWORD}`)
  console.log(`Employee login:    employee@ems.local / ${DEFAULT_PASSWORD}`)
  console.log("----------------------------------------------------")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
