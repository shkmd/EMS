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
        <StatCard label="Total Employees" value={employeeStats.total} icon={Users} />
        <StatCard label="Active" value={employeeStats.active} icon={UserCheck} accent="success" />
        <StatCard label="Inactive" value={employeeStats.inactive} icon={UserX} accent="destructive" />
        <StatCard label="New This Month" value={employeeStats.newThisMonth} icon={UserPlus} accent="warning" />
        <StatCard label="Departments" value={employeeStats.departmentCount} icon={Building2} />
        <StatCard label="Pending Leave Requests" value={pendingLeaveRequests} icon={CalendarClock} accent="warning" />
        <StatCard
          label="Attendance Today"
          value={`${attendanceToday.present} / ${attendanceToday.totalActive}`}
          icon={Clock}
          accent="success"
        />
        <StatCard label="Birthdays This Month" value={birthdays.length} icon={Cake} accent="info" />
        <StatCard label="Work Anniversaries" value={anniversaries.length} icon={PartyPopper} accent="violet" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EmployeeGrowthChart data={employeeGrowth} />
        <DepartmentChart data={departmentCounts} />
        <AttendanceChart data={attendanceStats} />
        <LeaveChart data={leaveStats} />
      </div>

      <CelebrationsCard birthdays={birthdays} anniversaries={anniversaries} />
    </div>
  );
}
