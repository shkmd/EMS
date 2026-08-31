import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireSession } from "@/features/auth/session";
import { canManageRecruitment } from "@/features/recruitment/authorization";
import { getCandidate } from "@/features/recruitment/queries";
import { CandidateDetailView } from "@/features/recruitment/components/candidate-detail-view";
import { SetBreadcrumbLabel } from "@/components/layout/page-breadcrumb";

export const metadata: Metadata = { title: "Candidate | EMS" };

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const candidateRaw = await getCandidate(id, session);
  const candidate = {
    ...candidateRaw,
    appliedAt: candidateRaw.appliedAt.toISOString(),
    interviews: candidateRaw.interviews.map((i) => ({
      ...i,
      scheduledAt: i.scheduledAt.toISOString(),
    })),
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <SetBreadcrumbLabel id={candidate.id} label={`${candidate.firstName} ${candidate.lastName}`} />
      <div>
        <Link
          href={`/recruitment/${candidate.jobOpening.id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to pipeline
        </Link>
      </div>

      <CandidateDetailView candidate={candidate} canManage={canManageRecruitment(session.role)} currentEmployeeId={session.employeeId ?? null} />
    </div>
  );
}
