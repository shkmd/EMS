import type { Metadata } from "next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/features/auth/session";
import { canViewTeamAttendance, canManageAttendance } from "@/features/attendance/authorization";
import { getTodayAttendance } from "@/features/attendance/queries";
import { TodayCard } from "@/features/attendance/components/today-card";
import { AttendanceCalendar } from "@/features/attendance/components/attendance-calendar";
import { TeamAttendanceTable } from "@/features/attendance/components/team-attendance-table";
import { AttendanceReport } from "@/features/attendance/components/attendance-report";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Attendance | EMS" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireSession();
  const { tab } = await searchParams;
  const showTeamTab = canViewTeamAttendance(session.role);
  const canManage = canManageAttendance(session.role);
  const hasEmployeeProfile = !!session.employeeId;
  const visibleTabs = [
    ...(hasEmployeeProfile ? ["my"] : []),
    ...(showTeamTab ? ["team", "reports"] : []),
  ];
  const defaultTab =
    tab && visibleTabs.includes(tab) ? tab : hasEmployeeProfile ? "my" : showTeamTab ? "team" : "reports";

  const [todayAttendance, departments, employees] = await Promise.all([
    session.employeeId ? getTodayAttendance(session.employeeId) : Promise.resolve(null),
    showTeamTab ? prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    showTeamTab
      ? prisma.employee.findMany({
          where: { deletedAt: null },
          select: { id: true, firstName: true, lastName: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const employeeOptions = employees.map((e) => ({ id: e.id, label: `${e.firstName} ${e.lastName}` }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">Check in/out, track working hours, and review history.</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {hasEmployeeProfile && <TabsTrigger value="my">My Attendance</TabsTrigger>}
          {showTeamTab && <TabsTrigger value="team">Team</TabsTrigger>}
          {showTeamTab && <TabsTrigger value="reports">Reports</TabsTrigger>}
        </TabsList>

        {hasEmployeeProfile && (
          <TabsContent value="my" className="mt-4 flex flex-col gap-4">
            <TodayCard
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
            />
            <AttendanceCalendar />
          </TabsContent>
        )}

        {showTeamTab && (
          <TabsContent value="team" className="mt-4">
            <TeamAttendanceTable />
          </TabsContent>
        )}

        {showTeamTab && (
          <TabsContent value="reports" className="mt-4">
            <AttendanceReport departments={departments} employees={employeeOptions} canManage={canManage} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
