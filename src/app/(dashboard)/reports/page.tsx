import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/features/auth/session";
import { canViewReports } from "@/features/reports/authorization";
import { listDepartments } from "@/features/departments/queries";
import { listLeaveTypes } from "@/features/leave/queries";
import { AttendanceReport } from "@/features/attendance/components/attendance-report";
import { LeaveReportCard } from "@/features/reports/components/leave-report-card";
import { LateSummaryReportCard } from "@/features/reports/components/late-summary-report-card";
import { AssetReportCard } from "@/features/reports/components/asset-report-card";
import { EmployeeReportCard } from "@/features/reports/components/employee-report-card";
import { PayrollReportCard } from "@/features/reports/components/payroll-report-card";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Reports | EMS" };

export default async function ReportsPage() {
  const session = await requireSession();
  const canView = canViewReports(session.role);

  const [departments, leaveTypes, employees] = await Promise.all([
    canView ? listDepartments() : Promise.resolve([]),
    canView ? listLeaveTypes() : Promise.resolve([]),
    canView
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
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Generate and export reports across the company.</p>
      </div>

      {canView ? (
        <>
          <EmployeeReportCard departments={departments} />
          <AttendanceReport departments={departments} employees={employeeOptions} canManage={false} />
          <LateSummaryReportCard departments={departments} />
          <LeaveReportCard departments={departments} leaveTypes={leaveTypes} />
          <PayrollReportCard departments={departments} />
          <AssetReportCard />
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You don&apos;t have access to company reports.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
