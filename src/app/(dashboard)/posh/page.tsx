import type { Metadata } from "next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/features/auth/session";
import { canManagePoshAdmin } from "@/features/posh/authorization";
import { listAssignableEmployees } from "@/features/projects/queries";
import { listCommitteeMembers, listCasesForAdmin, listMyAssignedCases, listMyFiledCases, isCommitteeMember } from "@/features/posh/queries";
import { CommitteeMembersList } from "@/features/posh/components/committee-members-list";
import { AdminCasesList } from "@/features/posh/components/admin-cases-list";
import { MyAssignedCasesList } from "@/features/posh/components/my-assigned-cases-list";
import { FileCaseFormWithList } from "@/features/posh/components/file-case-form-with-list";

export const metadata: Metadata = { title: "POSH | EMS" };

export default async function PoshPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireSession();
  const { tab } = await searchParams;
  const isAdmin = canManagePoshAdmin(session.role);
  const isMember = await isCommitteeMember(session);
  const hasEmployeeProfile = !!session.employeeId;

  const visibleTabs = [...(hasEmployeeProfile ? ["report"] : []), ...(isMember ? ["committee"] : []), ...(isAdmin ? ["manage"] : [])];
  const defaultTab = tab && visibleTabs.includes(tab) ? tab : (visibleTabs[0] ?? "report");

  const [myFiledCases, myAssignedCasesRaw] = await Promise.all([
    hasEmployeeProfile ? listMyFiledCases(session) : Promise.resolve([]),
    isMember ? listMyAssignedCases(session) : Promise.resolve([]),
  ]);

  const adminCasesRaw = isAdmin ? await listCasesForAdmin(session) : [];
  const committeeMembersRaw = isAdmin ? await listCommitteeMembers(session) : [];
  const employees = isAdmin ? await listAssignableEmployees() : [];

  const filedCases = myFiledCases.map((c) => ({
    id: c.id,
    caseNumber: c.caseNumber,
    status: c.status,
    outcome: c.outcome,
    createdAt: c.createdAt.toISOString(),
    resolvedAt: c.resolvedAt ? c.resolvedAt.toISOString() : null,
  }));
  const myAssignedCases = myAssignedCasesRaw.map((c) => ({
    id: c.id,
    caseNumber: c.caseNumber,
    status: c.status,
    respondentName: c.respondentName,
    createdAt: c.createdAt.toISOString(),
  }));
  const adminCases = adminCasesRaw.map((c) => ({
    id: c.id,
    caseNumber: c.caseNumber,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    resolvedAt: c.resolvedAt ? c.resolvedAt.toISOString() : null,
    assignments: c.assignments.map((a) => ({
      committeeMember: { id: a.committeeMember.id, employee: a.committeeMember.employee },
    })),
  }));
  const committeeOptions = committeeMembersRaw.map((m) => ({ id: m.id, name: `${m.employee.firstName} ${m.employee.lastName}` }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">POSH</h1>
        <p className="text-sm text-muted-foreground">Prevention of Sexual Harassment — confidential reporting and case management.</p>
      </div>

      {visibleTabs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">You don&apos;t have access to POSH.</CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            {hasEmployeeProfile && <TabsTrigger value="report">File a Report</TabsTrigger>}
            {isMember && <TabsTrigger value="committee">Committee</TabsTrigger>}
            {isAdmin && <TabsTrigger value="manage">Manage</TabsTrigger>}
          </TabsList>

          {hasEmployeeProfile && (
            <TabsContent value="report" className="mt-4">
              <FileCaseFormWithList initialCases={filedCases} />
            </TabsContent>
          )}
          {isMember && (
            <TabsContent value="committee" className="mt-4">
              <MyAssignedCasesList cases={myAssignedCases} />
            </TabsContent>
          )}
          {isAdmin && (
            <TabsContent value="manage" className="mt-4 flex flex-col gap-6">
              <CommitteeMembersList initialMembers={committeeMembersRaw} employees={employees} />
              <AdminCasesList initialCases={adminCases} committeeOptions={committeeOptions} />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
