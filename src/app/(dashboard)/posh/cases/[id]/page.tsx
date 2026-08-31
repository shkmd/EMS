import type { Metadata } from "next";

import { requireSession } from "@/features/auth/session";
import { getCaseDetail } from "@/features/posh/queries";
import { CaseDetailView } from "@/features/posh/components/case-detail-view";
import { SetBreadcrumbLabel } from "@/components/layout/page-breadcrumb";

export const metadata: Metadata = { title: "POSH Case | EMS" };

export default async function PoshCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const { viewAs, case: poshCase } = await getCaseDetail(id, session);

  const serialized = {
    ...poshCase,
    incidentDate: poshCase.incidentDate ? poshCase.incidentDate.toISOString() : null,
    createdAt: poshCase.createdAt.toISOString(),
    resolvedAt: poshCase.resolvedAt ? poshCase.resolvedAt.toISOString() : null,
    evidence: poshCase.evidence.map((e) => ({ id: e.id, fileName: e.fileName, uploadedAt: e.uploadedAt.toISOString() })),
    ...("updates" in poshCase
      ? { updates: poshCase.updates.map((u) => ({ id: u.id, note: u.note, createdAt: u.createdAt.toISOString(), author: u.author })) }
      : {}),
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <SetBreadcrumbLabel id={poshCase.id} label={poshCase.caseNumber} />
      <CaseDetailView viewAs={viewAs} initialCase={serialized} />
    </div>
  );
}
