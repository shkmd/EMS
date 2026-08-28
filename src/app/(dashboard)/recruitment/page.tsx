import type { Metadata } from "next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/features/auth/session";
import { canManageRecruitment } from "@/features/recruitment/authorization";
import { listMyInterviews } from "@/features/recruitment/queries";
import { JobOpeningsList } from "@/features/recruitment/components/job-openings-list";
import { MyInterviewsList } from "@/features/recruitment/components/my-interviews-list";

export const metadata: Metadata = { title: "Recruitment | EMS" };

export default async function RecruitmentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireSession();
  const { tab } = await searchParams;
  const canManage = canManageRecruitment(session.role);
  const hasEmployeeProfile = !!session.employeeId;

  const visibleTabs = [...(canManage ? ["openings"] : []), ...(hasEmployeeProfile ? ["my-interviews"] : [])];
  const defaultTab = tab && visibleTabs.includes(tab) ? tab : canManage ? "openings" : "my-interviews";

  const myInterviewsRaw = hasEmployeeProfile ? await listMyInterviews(session) : [];
  const myInterviews = myInterviewsRaw.map((i) => ({
    ...i,
    scheduledAt: i.scheduledAt.toISOString(),
    panelists: i.panelists.map((p) => ({ feedback: p.feedback })),
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recruitment</h1>
        <p className="text-sm text-muted-foreground">Job openings, candidate pipelines, and interview panels.</p>
      </div>

      {!canManage && !hasEmployeeProfile ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">You don&apos;t have access to recruitment.</CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            {canManage && <TabsTrigger value="openings">Job Openings</TabsTrigger>}
            {hasEmployeeProfile && <TabsTrigger value="my-interviews">My Interviews</TabsTrigger>}
          </TabsList>

          {canManage && (
            <TabsContent value="openings" className="mt-4">
              <JobOpeningsList />
            </TabsContent>
          )}
          {hasEmployeeProfile && (
            <TabsContent value="my-interviews" className="mt-4">
              <MyInterviewsList initialInterviews={myInterviews} />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
