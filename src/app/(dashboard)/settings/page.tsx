import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/features/auth/session";
import { canManageSettings } from "@/features/settings/authorization";
import { canManageEmployees } from "@/features/employees/authorization";
import { CompanySettingsForm } from "@/features/settings/components/company-settings-form";
import { WorkingHoursSettingsForm } from "@/features/settings/components/working-hours-settings-form";
import { VerticalsManager } from "@/features/verticals/components/verticals-manager";
import { LeaveTypesManager } from "@/features/settings/components/leave-types-manager";
import { EmailSettingsForm } from "@/features/settings/components/email-settings-form";
import { SystemSettingsForm } from "@/features/settings/components/system-settings-form";
import { RolesLegend } from "@/features/users/components/roles-legend";
import { UsersTable } from "@/features/users/components/users-table";
import { DocumentTemplatesManager } from "@/features/hr-documents/components/document-templates-manager";

export const metadata: Metadata = { title: "Settings | EMS" };

export default async function SettingsPage() {
  const session = await requireSession();
  // Full system settings stay SUPER_ADMIN-only, but HR also generates the
  // documents these templates control, so they get access to just that tab.
  const canManage = canManageSettings(session.role);
  const canManageDocs = canManageEmployees(session.role);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Company-wide configuration.</p>
      </div>

      {canManage || canManageDocs ? (
        <Tabs defaultValue={canManage ? "company" : "documents"}>
          <TabsList>
            {canManage && <TabsTrigger value="company">Company</TabsTrigger>}
            {canManage && <TabsTrigger value="working-hours">Working Hours</TabsTrigger>}
            {canManage && <TabsTrigger value="leave-rules">Leave Rules</TabsTrigger>}
            {canManageDocs && <TabsTrigger value="documents">Documents</TabsTrigger>}
            {canManage && <TabsTrigger value="email">Email</TabsTrigger>}
            {canManage && <TabsTrigger value="system">System</TabsTrigger>}
            {canManage && <TabsTrigger value="users">Users</TabsTrigger>}
          </TabsList>

          {canManage && (
            <TabsContent value="company" className="mt-4">
              <CompanySettingsForm />
            </TabsContent>
          )}
          {canManage && (
            <TabsContent value="working-hours" className="mt-4 flex flex-col gap-6">
              <VerticalsManager />
              <WorkingHoursSettingsForm />
            </TabsContent>
          )}
          {canManage && (
            <TabsContent value="leave-rules" className="mt-4">
              <LeaveTypesManager />
            </TabsContent>
          )}
          {canManageDocs && (
            <TabsContent value="documents" className="mt-4">
              <DocumentTemplatesManager />
            </TabsContent>
          )}
          {canManage && (
            <TabsContent value="email" className="mt-4">
              <EmailSettingsForm />
            </TabsContent>
          )}
          {canManage && (
            <TabsContent value="system" className="mt-4">
              <SystemSettingsForm />
            </TabsContent>
          )}
          {canManage && (
            <TabsContent value="users" className="mt-4 flex flex-col gap-6">
              <RolesLegend />
              <UsersTable viewerId={session.sub} />
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You don&apos;t have access to system settings.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
