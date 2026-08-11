import type { Metadata } from "next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/features/auth/session";
import { canActAsHr, canViewTeamLeave } from "@/features/leave/authorization";
import { listLeaveTypes, getLeaveBalances, listLeaveRequests } from "@/features/leave/queries";
import { ApplyLeaveDialog } from "@/features/leave/components/apply-leave-dialog";
import { LeaveBalanceCards } from "@/features/leave/components/leave-balance-cards";
import { LeaveHistoryTable } from "@/features/leave/components/leave-history-table";
import { LeaveApprovalsTable } from "@/features/leave/components/leave-approvals-table";
import { LeaveAllRequestsTable } from "@/features/leave/components/leave-all-requests-table";
import { LeaveCalendar } from "@/features/leave/components/leave-calendar";

export const metadata: Metadata = { title: "Leave | EMS" };

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireSession();
  const { tab } = await searchParams;
  const isManager = session.role === "MANAGER";
  const isHr = canActAsHr(session.role);
  const showApprovalsTab = isManager || isHr;
  const showAllRequestsTab = canViewTeamLeave(session.role);
  const hasEmployeeProfile = !!session.employeeId;
  const visibleTabs = [
    ...(hasEmployeeProfile ? ["my"] : []),
    ...(showApprovalsTab ? ["approvals"] : []),
    ...(showAllRequestsTab ? ["all"] : []),
    "calendar",
  ];
  const defaultTab =
    tab && visibleTabs.includes(tab) ? tab : hasEmployeeProfile ? "my" : showApprovalsTab ? "approvals" : "calendar";

  const [leaveTypes, balances, myRequests] = await Promise.all([
    listLeaveTypes(),
    session.employeeId ? getLeaveBalances(session.employeeId, new Date().getFullYear()) : Promise.resolve([]),
    session.employeeId ? listLeaveRequests({ scope: "mine" }, session) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leave</h1>
          <p className="text-sm text-muted-foreground">Apply for leave, track balances, and review approvals.</p>
        </div>
        {hasEmployeeProfile && <ApplyLeaveDialog leaveTypes={leaveTypes} />}
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {hasEmployeeProfile && <TabsTrigger value="my">My Leave</TabsTrigger>}
          {showApprovalsTab && <TabsTrigger value="approvals">Approvals</TabsTrigger>}
          {showAllRequestsTab && <TabsTrigger value="all">All Requests</TabsTrigger>}
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        {hasEmployeeProfile && (
          <TabsContent value="my" className="mt-4 flex flex-col gap-4">
            <LeaveBalanceCards balances={balances} />
            <LeaveHistoryTable
              requests={myRequests.map((r) => ({
                id: r.id,
                startDate: r.startDate,
                endDate: r.endDate,
                days: Number(r.days),
                duration: r.duration,
                reason: r.reason,
                status: r.status,
                leaveType: { name: r.leaveType.name },
              }))}
            />
          </TabsContent>
        )}

        {showApprovalsTab && (
          <TabsContent value="approvals" className="mt-4">
            {isHr ? (
              <LeaveApprovalsTable scope="hr-pending" actionType="hr" />
            ) : (
              <LeaveApprovalsTable scope="team-pending" actionType="manager" />
            )}
          </TabsContent>
        )}

        {showAllRequestsTab && (
          <TabsContent value="all" className="mt-4">
            <LeaveAllRequestsTable canEdit={isHr} leaveTypes={leaveTypes} />
          </TabsContent>
        )}

        <TabsContent value="calendar" className="mt-4">
          <LeaveCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
