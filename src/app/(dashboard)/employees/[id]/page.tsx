import Link from "next/link";
import type { Metadata } from "next";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/features/auth/session";
import { canManageEmployees } from "@/features/employees/authorization";
import { getEmployeeDetail } from "@/features/employees/queries";
import { EmployeeOverview } from "@/features/employees/components/employee-overview";
import { EmployeeNotes } from "@/features/employees/components/employee-notes";
import { EmployeeDocuments } from "@/features/employees/components/employee-documents";
import { EmployeeTimeline } from "@/features/employees/components/employee-timeline";
import { EmployeePhotoUpload } from "@/features/employees/components/employee-photo-upload";
import { PrintProfileButton } from "@/features/employees/components/print-profile-button";
import { AccountAccessCard } from "@/features/employees/components/account-access-card";

export const metadata: Metadata = { title: "Employee Profile | EMS" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  ON_LEAVE: "secondary",
  INACTIVE: "outline",
  TERMINATED: "destructive",
};

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const employee = await getEmployeeDetail(id, session);
  const canManage = canManageEmployees(session.role);

  return (
    <div className="flex flex-1 flex-col gap-6">
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

      <Tabs defaultValue="overview">
        <TabsList className="print:hidden">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
