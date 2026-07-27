import type { Metadata } from "next";
import { Users, UserCheck, UserX, UserPlus, Building2, CalendarClock, Clock, Cake, PartyPopper } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/features/auth/session";
import { canManageEmployees } from "@/features/employees/authorization";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { VerticalFilter } from "@/features/dashboard/components/vertical-filter";
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
  getEmployeeVerticalId,
  listVerticals,
} from "@/features/dashboard/queries";

export const metadata: Metadata = { title: "Dashboard | EMS" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ vertical?: string }>;
}) {
  const session = await requireSession();
  const { vertical: requestedVerticalId } = await searchParams;
  const canSwitchVertical = canManageEmployees(session.role);

  const verticals = await listVerticals();

  let verticalId: string | undefined;
  if (canSwitchVertical) {
    verticalId = requestedVerticalId && verticals.some((v) => v.id === requestedVerticalId) ? requestedVerticalId : undefined;
  } else {
    verticalId = session.employeeId ? (await getEmployeeVerticalId(session.employeeId)) ?? undefined : undefined;
  }

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
    getEmployeeStats(verticalId),
    getPendingLeaveRequestsCount(verticalId),
    getAttendanceToday(verticalId),
    getBirthdaysThisMonth(verticalId),
    getWorkAnniversariesThisMonth(verticalId),
    getEmployeeGrowth(6, verticalId),
    getDepartmentWiseEmployeeCounts(verticalId),
    getAttendanceStatistics(14, verticalId),
    getLeaveStatistics(verticalId),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Company-wide overview.</p>
        </div>
        {canSwitchVertical && verticals.length > 0 && <VerticalFilter verticals={verticals} />}
        {!canSwitchVertical && verticalId && (
          <Badge variant="secondary">Showing: {verticals.find((v) => v.id === verticalId)?.name}</Badge>
        )}
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
