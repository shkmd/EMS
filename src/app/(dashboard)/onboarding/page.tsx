import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/features/auth/session";
import { canManageEmployees } from "@/features/employees/authorization";
import { OnboardingListClient } from "@/features/onboarding/components/onboarding-list-client";

export const metadata: Metadata = { title: "Onboarding | EMS" };

export default async function OnboardingPage() {
  const session = await requireSession();
  const canManage = canManageEmployees(session.role);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Onboarding</h1>
        <p className="text-sm text-muted-foreground">Everyone currently being onboarded, and where each stands.</p>
      </div>

      {canManage ? (
        <OnboardingListClient />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">You don&apos;t have access to onboarding.</CardContent>
        </Card>
      )}
    </div>
  );
}
