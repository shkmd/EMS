import type { Metadata } from "next";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/features/auth/session";
import { canManagePayroll } from "@/features/payroll/authorization";
import { listPayslips, listPayrollEmployees } from "@/features/payroll/queries";
import { PayrollTable } from "@/features/payroll/components/payroll-table";
import { PAYSLIP_STATUS_BADGE } from "@/features/payroll/lib/status-labels";

export const metadata: Metadata = { title: "Payroll | EMS" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function PayrollPage() {
  const session = await requireSession();
  const canManage = canManagePayroll(session.role);
  const hasEmployeeProfile = !!session.employeeId;

  const [myPayslips, employees] = await Promise.all([
    session.employeeId ? listPayslips({ employeeId: session.employeeId }, session) : Promise.resolve([]),
    canManage ? listPayrollEmployees() : Promise.resolve([]),
  ]);

  const employeeOptions = employees
    .filter((e) => e.basicSalary !== null)
    .map((e) => ({ id: e.id, label: `${e.firstName} ${e.lastName} (${e.employeeCode})` }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
        <p className="text-sm text-muted-foreground">Generate payslips and review salary history.</p>
      </div>

      {!hasEmployeeProfile && !canManage ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Your account isn&apos;t linked to an employee profile, so there&apos;s no payroll data to show here.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={canManage ? "manage" : "my"}>
          <TabsList>
            {canManage && <TabsTrigger value="manage">Payroll Runs</TabsTrigger>}
            {hasEmployeeProfile && <TabsTrigger value="my">My Payslips</TabsTrigger>}
          </TabsList>

          {canManage && (
            <TabsContent value="manage" className="mt-4">
              <PayrollTable employees={employeeOptions} />
            </TabsContent>
          )}

          {hasEmployeeProfile && (
            <TabsContent value="my" className="mt-4">
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myPayslips.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No payslips yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      myPayslips.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            {MONTHS[p.month - 1]} {p.year}
                          </TableCell>
                          <TableCell>{Number(p.grossEarnings).toFixed(2)}</TableCell>
                          <TableCell>{Number(p.totalDeductions).toFixed(2)}</TableCell>
                          <TableCell className="font-medium">{Number(p.netSalary).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={PAYSLIP_STATUS_BADGE[p.status]}>{p.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon-sm" asChild>
                              <a href={`/api/payroll/${p.id}/pdf`}>
                                <Download />
                              </a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
