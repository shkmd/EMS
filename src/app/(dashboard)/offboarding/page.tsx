import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/features/auth/session";
import { canManageEmployees } from "@/features/employees/authorization";
import { OffboardingListClient } from "@/features/offboarding/components/offboarding-list-client";

export const metadata: Metadata = { title: "Offboarding | EMS" };

export default async function OffboardingPage() {
  const session = await requireSession();
  const canManage = canManageEmployees(session.role);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Offboarding</h1>
        <p className="text-sm text-muted-foreground">Everyone currently exiting the company, and where each stands.</p>
      </div>

      {canManage ? (
        <OffboardingListClient />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">You don&apos;t have access to offboarding.</CardContent>
        </Card>
      )}
    </div>
  );
}
