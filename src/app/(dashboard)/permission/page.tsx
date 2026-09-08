import type { Metadata } from "next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/features/auth/session";
import { canActAsHr, canViewTeamPermission } from "@/features/permission/authorization";
import { listPermissionRequests } from "@/features/permission/queries";
import { ApplyPermissionDialog } from "@/features/permission/components/apply-permission-dialog";
import { PermissionHistoryTable } from "@/features/permission/components/permission-history-table";
import { PermissionApprovalsTable } from "@/features/permission/components/permission-approvals-table";
import { PermissionAllRequestsTable } from "@/features/permission/components/permission-all-requests-table";

export const metadata: Metadata = { title: "Permission | EMS" };

export default async function PermissionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireSession();
  const { tab } = await searchParams;
  const isManager = session.role === "MANAGER";
  const isHr = canActAsHr(session.role);
  const showApprovalsTab = isManager || isHr;
  const showAllRequestsTab = canViewTeamPermission(session.role);
  const hasEmployeeProfile = !!session.employeeId;
  const visibleTabs = [
    ...(hasEmployeeProfile ? ["my"] : []),
    ...(showApprovalsTab ? ["approvals"] : []),
    ...(showAllRequestsTab ? ["all"] : []),
  ];
  const defaultTab = tab && visibleTabs.includes(tab) ? tab : (visibleTabs[0] ?? "my");

  const myRequests = session.employeeId ? await listPermissionRequests({ scope: "mine" }, session) : [];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Permission</h1>
          <p className="text-sm text-muted-foreground">Request a short excused absence during the workday, and review approvals.</p>
        </div>
        {hasEmployeeProfile && <ApplyPermissionDialog />}
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {hasEmployeeProfile && <TabsTrigger value="my">My Requests</TabsTrigger>}
          {showApprovalsTab && <TabsTrigger value="approvals">Approvals</TabsTrigger>}
          {showAllRequestsTab && <TabsTrigger value="all">All Requests</TabsTrigger>}
        </TabsList>

        {hasEmployeeProfile && (
          <TabsContent value="my" className="mt-4">
            <PermissionHistoryTable
              requests={myRequests.map((r) => ({
                id: r.id,
                date: r.date,
                fromTime: r.fromTime,
                toTime: r.toTime,
                hours: Number(r.hours),
                reason: r.reason,
                status: r.status,
              }))}
            />
          </TabsContent>
        )}

        {showApprovalsTab && (
          <TabsContent value="approvals" className="mt-4">
            {isHr ? (
              <PermissionApprovalsTable scope="hr-pending" actionType="hr" />
            ) : (
              <PermissionApprovalsTable scope="team-pending" actionType="manager" />
            )}
          </TabsContent>
        )}

        {showAllRequestsTab && (
          <TabsContent value="all" className="mt-4">
            <PermissionAllRequestsTable canRecord={isHr} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
