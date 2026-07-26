import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/features/auth/session";
import { canViewAuditLogs } from "@/features/audit/authorization";
import { AuditLogTable } from "@/features/audit/components/audit-log-table";

export const metadata: Metadata = { title: "Audit Logs | EMS" };

export default async function AuditLogsPage() {
  const session = await requireSession();
  const canView = canViewAuditLogs(session.role);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Every create, update, delete, and approval action across the company.</p>
      </div>

      {canView ? (
        <AuditLogTable />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You don&apos;t have access to audit logs.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
