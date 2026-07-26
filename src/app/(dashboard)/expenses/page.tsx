import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/features/auth/session";
import { canActAsHr } from "@/features/expenses/authorization";
import { listExpenseClaims } from "@/features/expenses/queries";
import { ApplyExpenseDialog } from "@/features/expenses/components/apply-expense-dialog";
import { ExpenseHistoryTable } from "@/features/expenses/components/expense-history-table";
import { ExpenseApprovalsTable } from "@/features/expenses/components/expense-approvals-table";

export const metadata: Metadata = { title: "Expenses | EMS" };

export default async function ExpensesPage() {
  const session = await requireSession();
  const isManager = session.role === "MANAGER";
  const isHr = canActAsHr(session.role);
  const showApprovalsTab = isManager || isHr;
  const hasEmployeeProfile = !!session.employeeId;

  const myClaims = hasEmployeeProfile ? await listExpenseClaims({ scope: "mine" }, session) : [];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Submit expense claims and track approvals and reimbursement.</p>
        </div>
        {hasEmployeeProfile && <ApplyExpenseDialog />}
      </div>

      {!hasEmployeeProfile && !showApprovalsTab ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Your account isn&apos;t linked to an employee profile, so there&apos;s no expense data to show here.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={hasEmployeeProfile ? "my" : "approvals"}>
          <TabsList>
            {hasEmployeeProfile && <TabsTrigger value="my">My Expenses</TabsTrigger>}
            {showApprovalsTab && <TabsTrigger value="approvals">Approvals</TabsTrigger>}
          </TabsList>

          {hasEmployeeProfile && (
            <TabsContent value="my" className="mt-4">
              <ExpenseHistoryTable
                claims={myClaims.map((c) => ({
                  id: c.id,
                  category: c.category,
                  title: c.title,
                  amount: Number(c.amount),
                  expenseDate: c.expenseDate,
                  status: c.status,
                  receiptName: c.receiptName,
                }))}
              />
            </TabsContent>
          )}

          {showApprovalsTab && (
            <TabsContent value="approvals" className="mt-4">
              {isHr ? (
                <ExpenseApprovalsTable scope="hr-pending" actionType="hr" />
              ) : (
                <ExpenseApprovalsTable scope="team-pending" actionType="manager" />
              )}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
