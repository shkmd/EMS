import type { Metadata } from "next";

import { requireSession } from "@/features/auth/session";
import { canManageEmployees } from "@/features/employees/authorization";
import { canManageSubscriptions } from "@/features/subscriptions/authorization";
import { getUpcomingSubscriptionRenewals } from "@/features/subscriptions/queries";
import { TodayBar } from "@/features/dashboard/components/today-bar";
import { KpiCards } from "@/features/dashboard/components/kpi-cards";
import { EmployeeGrowthChart } from "@/features/dashboard/components/employee-growth-chart";
import { DepartmentChart } from "@/features/dashboard/components/department-chart";
import { AttendanceDonutChart } from "@/features/dashboard/components/attendance-donut-chart";
import { LeaveSummaryCard } from "@/features/dashboard/components/leave-summary-card";
import { UpcomingEventsCard } from "@/features/dashboard/components/upcoming-events-card";
import { QuickAccessCard } from "@/features/dashboard/components/quick-access-card";
import { getTodayAttendance } from "@/features/attendance/queries";
import { MyTasksCard } from "@/features/projects/components/my-tasks-card";
import { DailyLogCard } from "@/features/daily-log/components/daily-log-card";
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
  const canSeeSubscriptions = canManageSubscriptions(session.role);

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
    todayAttendance,
    upcomingRenewals,
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
    session.employeeId ? getTodayAttendance(session.employeeId) : Promise.resolve(null),
    canSeeSubscriptions ? getUpcomingSubscriptionRenewals() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TodayBar
        showAttendance={!!session.employeeId}
        initial={
          todayAttendance
            ? {
                id: todayAttendance.id,
                status: todayAttendance.status,
                checkIn: todayAttendance.checkIn?.toISOString() ?? null,
                checkOut: todayAttendance.checkOut?.toISOString() ?? null,
                workingMinutes: todayAttendance.workingMinutes,
                breakMinutes: todayAttendance.breakMinutes,
                breaks: todayAttendance.breaks.map((b) => ({
                  id: b.id,
                  breakStart: b.breakStart.toISOString(),
                  breakEnd: b.breakEnd?.toISOString() ?? null,
                })),
              }
            : null
        }
        verticals={verticals}
        canSwitchVertical={canSwitchVertical}
        verticalName={verticalId ? verticals.find((v) => v.id === verticalId)?.name : undefined}
      />

      <KpiCards employeeStats={employeeStats} attendanceToday={attendanceToday} pendingLeaveRequests={pendingLeaveRequests} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AttendanceDonutChart data={attendanceStats} />
        <EmployeeGrowthChart data={employeeGrowth} />
        <UpcomingEventsCard birthdays={birthdays} anniversaries={anniversaries} renewals={canSeeSubscriptions ? upcomingRenewals : []} />
      </div>

      {session.employeeId ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr_1fr]">
          <MyTasksCard />
          <DailyLogCard />
          <QuickAccessCard canAddEmployee={canSwitchVertical} />
        </div>
      ) : (
        <QuickAccessCard canAddEmployee={canSwitchVertical} />
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DepartmentChart data={departmentCounts} />
        </div>
        <LeaveSummaryCard data={leaveStats} />
      </div>
    </div>
  );
}
