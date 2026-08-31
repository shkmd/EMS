import type { Metadata } from "next";

import { requireSession } from "@/features/auth/session";
import { canManagePolicies } from "@/features/policies/authorization";
import { getPolicy, listAcknowledgmentsForPolicy } from "@/features/policies/queries";
import { PolicyDetailView } from "@/features/policies/components/policy-detail-view";
import { SetBreadcrumbLabel } from "@/components/layout/page-breadcrumb";

export const metadata: Metadata = { title: "Policy | EMS" };

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const { policy, myAcknowledgment } = await getPolicy(id, session);
  const canManage = canManagePolicies(session.role);

  const acknowledgments = canManage
    ? (await listAcknowledgmentsForPolicy(id, session)).map((a) => ({
        id: a.id,
        acknowledgedAt: a.acknowledgedAt.toISOString(),
        employee: a.employee,
      }))
    : null;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <SetBreadcrumbLabel id={policy.id} label={policy.title} />
      <PolicyDetailView
        policy={{
          id: policy.id,
          title: policy.title,
          category: policy.category,
          content: policy.content,
          version: policy.version,
          effectiveDate: policy.effectiveDate ? policy.effectiveDate.toISOString() : null,
          isPublished: policy.isPublished,
          requiresAcknowledgment: policy.requiresAcknowledgment,
        }}
        hasAcknowledged={!!myAcknowledgment}
        canManage={canManage}
        acknowledgments={acknowledgments}
      />
    </div>
  );
}
