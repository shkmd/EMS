import Link from "next/link";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/features/auth/session";
import { ForbiddenError } from "@/lib/errors";
import { canManageEmployees } from "@/features/employees/authorization";
import { getEmployeeDetail } from "@/features/employees/queries";
import { EmployeeOverview } from "@/features/employees/components/employee-overview";
import { EmployeeNotes } from "@/features/employees/components/employee-notes";
import { EmployeeDocuments } from "@/features/employees/components/employee-documents";
import { EmployeeTimeline } from "@/features/employees/components/employee-timeline";
import { OffboardingTab } from "@/features/offboarding/components/offboarding-tab";
import { OnboardingTab } from "@/features/onboarding/components/onboarding-tab";
import { EmployeePhotoUpload } from "@/features/employees/components/employee-photo-upload";
import { PrintProfileButton } from "@/features/employees/components/print-profile-button";
import { AccountAccessCard } from "@/features/employees/components/account-access-card";
import { canViewTeamLeave } from "@/features/leave/authorization";
import { getLeaveBalances } from "@/features/leave/queries";
import { LeaveBalanceCards } from "@/features/leave/components/leave-balance-cards";
import { SetBreadcrumbLabel } from "@/components/layout/page-breadcrumb";

export const metadata: Metadata = { title: "Employee Profile | EMS" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  ON_LEAVE: "secondary",
  INACTIVE: "outline",
  TERMINATED: "destructive",
};

const VALID_TABS = ["overview", "documents", "notes", "timeline", "onboarding", "offboarding"];

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const { tab } = await searchParams;
  const defaultTab = tab && VALID_TABS.includes(tab) ? tab : "overview";

  let employee: Awaited<ReturnType<typeof getEmployeeDetail>>;
  try {
    employee = await getEmployeeDetail(id, session);
  } catch (error) {
    if (error instanceof ForbiddenError) forbidden();
    throw error;
  }
  const canManage = canManageEmployees(session.role);
  const canViewLeaveBalance = canViewTeamLeave(session.role);
  const leaveBalances = canViewLeaveBalance
    ? await getLeaveBalances(employee.id, new Date().getFullYear())
    : [];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <SetBreadcrumbLabel id={employee.id} label={`${employee.firstName} ${employee.lastName}`} />
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <EmployeePhotoUpload
            employeeId={employee.id}
            firstName={employee.firstName}
            lastName={employee.lastName}
            hasPhoto={!!employee.profilePhotoUrl}
            editable={canManage || session.employeeId === employee.id}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">
                {employee.firstName} {employee.lastName}
              </h1>
              <Badge variant={STATUS_VARIANT[employee.status] ?? "outline"}>{employee.status.replace("_", " ")}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {employee.employeeCode} · {employee.designation?.title ?? "No designation"} ·{" "}
              {employee.department?.name ?? "No department"}
              {employee.vertical && <> · {employee.vertical.name}</>}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <PrintProfileButton />
            {canManage && (
              <Button asChild>
                <Link href={`/employees/${employee.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <AccountAccessCard
          employeeId={employee.id}
          user={employee.user}
          viewerCanGrantSuperAdmin={session.role === "SUPER_ADMIN"}
        />
      )}

      {canViewLeaveBalance && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <h2 className="text-sm font-medium">Leave Balance ({new Date().getFullYear()})</h2>
            <LeaveBalanceCards balances={leaveBalances} />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={defaultTab}>
        <TabsList className="print:hidden">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          {canManage && <TabsTrigger value="onboarding">Onboarding</TabsTrigger>}
          {canManage && <TabsTrigger value="offboarding">Offboarding</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview" className="mt-3">
          <EmployeeOverview employee={employee} />
        </TabsContent>
        <TabsContent value="documents" className="mt-3">
          <Card>
            <CardContent className="pt-6">
              <EmployeeDocuments employeeId={employee.id} documents={employee.documents} canManage={canManage} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notes" className="mt-3">
          <Card>
            <CardContent className="pt-6">
              <EmployeeNotes employeeId={employee.id} notes={employee.notes} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="timeline" className="mt-3">
          <Card>
            <CardContent className="pt-6">
              <EmployeeTimeline events={employee.timelineEvents} />
            </CardContent>
          </Card>
        </TabsContent>
        {canManage && (
          <TabsContent value="onboarding" className="mt-3">
            <OnboardingTab employeeId={employee.id} hasPortalAccess={!!employee.user?.isActive} />
          </TabsContent>
        )}
        {canManage && (
          <TabsContent value="offboarding" className="mt-3">
            <OffboardingTab employeeId={employee.id} employeeStatus={employee.status} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
