import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/features/auth/session";
import { canManageSubscriptions } from "@/features/subscriptions/authorization";
import { listSubscriptions } from "@/features/subscriptions/queries";
import { SubscriptionsClient } from "@/features/subscriptions/components/subscriptions-client";

export const metadata: Metadata = { title: "Subscriptions | EMS" };

export default async function SubscriptionsPage() {
  const session = await requireSession();
  const canManage = canManageSubscriptions(session.role);

  const subscriptions = canManage ? await listSubscriptions() : [];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">
          Company software, domain, and service subscriptions — reminded 7 days before renewal or expiry.
        </p>
      </div>

      {canManage ? (
        <SubscriptionsClient
          subscriptions={subscriptions.map((s) => ({
            id: s.id,
            name: s.name,
            vendor: s.vendor,
            category: s.category,
            cost: s.cost,
            billingCycle: s.billingCycle,
            startDate: s.startDate ? s.startDate.toISOString() : null,
            endDate: s.endDate.toISOString(),
            notifyEmployeeId: s.notifyEmployeeId,
            notifyEmployee: s.notifyEmployee,
            notes: s.notes,
            status: s.status,
          }))}
          canManage={canManage}
        />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You don&apos;t have access to subscriptions.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
