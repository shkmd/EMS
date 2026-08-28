import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/features/auth/session";
import { getJobOpening, listCandidates } from "@/features/recruitment/queries";
import { JOB_OPENING_STATUS_BADGE, JOB_OPENING_STATUS_LABEL, EMPLOYMENT_TYPE_LABEL } from "@/features/recruitment/lib/labels";
import { CandidatePipeline } from "@/features/recruitment/components/candidate-pipeline";

export const metadata: Metadata = { title: "Job Opening | EMS" };

export default async function JobOpeningDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const [jobOpening, candidatesRaw] = await Promise.all([getJobOpening(id, session), listCandidates(id, session)]);
  const candidates = candidatesRaw.map((c) => ({ ...c, appliedAt: c.appliedAt.toISOString() }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <Link href="/recruitment" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> All openings
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{jobOpening.title}</h1>
          <Badge className={JOB_OPENING_STATUS_BADGE[jobOpening.status]}>{JOB_OPENING_STATUS_LABEL[jobOpening.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {jobOpening.department?.name ?? "No department"} · {EMPLOYMENT_TYPE_LABEL[jobOpening.employmentType]} ·{" "}
          {jobOpening.numberOfPositions} position{jobOpening.numberOfPositions === 1 ? "" : "s"}
        </p>
        {jobOpening.description && <p className="mt-2 max-w-2xl text-sm">{jobOpening.description}</p>}
      </div>

      <CandidatePipeline jobOpeningId={jobOpening.id} initialCandidates={candidates} />
    </div>
  );
}
