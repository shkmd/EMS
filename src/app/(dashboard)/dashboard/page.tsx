import type { Metadata } from "next";
import { Users, UserCheck, UserX, UserPlus, Building2, CalendarClock, Clock, Cake, PartyPopper } from "lucide-react";

import { requireSession } from "@/features/auth/session";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { EmployeeGrowthChart } from "@/features/dashboard/components/employee-growth-chart";
import { DepartmentChart } from "@/features/dashboard/components/department-chart";
import { AttendanceChart } from "@/features/dashboard/components/attendance-chart";
import { LeaveChart } from "@/features/dashboard/components/leave-chart";
import { CelebrationsCard } from "@/features/dashboard/components/celebrations-card";
import {
  getEmployeeStats,
  getPendingLeaveRequestsCount,
  getAttendanceToday,
  getBirthdaysThisMonth,
  getWorkAnniversariesThisMonth,
  getEmployeeGrowth,
  getDepartmentWiseEmployeeCounts,
  getAttendanceStatistics,
  getLeaveStatistics,
} from "@/features/dashboard/queries";

export const metadata: Metadata = { title: "Dashboard | EMS" };

export default async function DashboardPage() {
  await requireSession();

  const [
    employeeStats,
    pendingLeaveRequests,
    attendanceToday,
    birthdays,
    anniversaries,
    employeeGrowth,
    departmentCounts,
    attendanceStats,
    leaveStats,
  ] = await Promise.all([
    getEmployeeStats(),
    getPendingLeaveRequestsCount(),
    getAttendanceToday(),
    getBirthdaysThisMonth(),
    getWorkAnniversariesThisMonth(),
    getEmployeeGrowth(6),
    getDepartmentWiseEmployeeCounts(),
    getAttendanceStatistics(14),
    getLeaveStatistics(),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Company-wide overview.</p>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Employees" value={employeeStats.total} icon={Users} href="/employees" />
        <StatCard
          label="Active"
          value={employeeStats.active}
          icon={UserCheck}
          accent="success"
          href="/employees?status=ACTIVE"
        />
        <StatCard
          label="Inactive"
          value={employeeStats.inactive}
          icon={UserX}
          accent="destructive"
          href="/employees?status=INACTIVE"
        />
        <StatCard
          label="New This Month"
          value={employeeStats.newThisMonth}
          icon={UserPlus}
          accent="warning"
          href="/employees?sortBy=dateOfJoining&sortOrder=desc"
        />
        <StatCard label="Departments" value={employeeStats.departmentCount} icon={Building2} href="/departments" />
        <StatCard
          label="Pending Leave Requests"
          value={pendingLeaveRequests}
          icon={CalendarClock}
          accent="warning"
          href="/leave?tab=approvals"
        />
        <StatCard
          label="Attendance Today"
          value={`${attendanceToday.present} / ${attendanceToday.totalActive}`}
          icon={Clock}
          accent="success"
          href="/attendance?tab=team"
        />
        <StatCard label="Birthdays This Month" value={birthdays.length} icon={Cake} accent="info" href="#celebrations" />
        <StatCard
          label="Work Anniversaries"
          value={anniversaries.length}
          icon={PartyPopper}
          accent="violet"
          href="#celebrations"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EmployeeGrowthChart data={employeeGrowth} />
        <DepartmentChart data={departmentCounts} />
        <AttendanceChart data={attendanceStats} />
        <LeaveChart data={leaveStats} />
      </div>

      <div id="celebrations" className="scroll-mt-20">
        <CelebrationsCard birthdays={birthdays} anniversaries={anniversaries} />
      </div>
    </div>
  );
}
