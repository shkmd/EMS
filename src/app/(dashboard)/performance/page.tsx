import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/features/auth/session";
import { canManagePerformance } from "@/features/performance/authorization";
import { GoalsPanel } from "@/features/performance/components/goals-panel";
import { KpisPanel } from "@/features/performance/components/kpis-panel";
import { ReviewsPanel } from "@/features/performance/components/reviews-panel";
import { TeamPerformance } from "@/features/performance/components/team-performance";

export const metadata: Metadata = { title: "Performance | EMS" };

export default async function PerformancePage() {
  const session = await requireSession();
  const showTeamTab = canManagePerformance(session.role);
  const hasEmployeeProfile = !!session.employeeId;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Performance</h1>
        <p className="text-sm text-muted-foreground">Goals, KPIs, and performance reviews.</p>
      </div>

      {!hasEmployeeProfile && !showTeamTab ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Your account isn&apos;t linked to an employee profile, so there&apos;s no performance data to show here.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={hasEmployeeProfile ? "my" : "team"}>
          <TabsList>
            {hasEmployeeProfile && <TabsTrigger value="my">My Performance</TabsTrigger>}
            {showTeamTab && <TabsTrigger value="team">Team</TabsTrigger>}
          </TabsList>

          {hasEmployeeProfile && session.employeeId && (
            <TabsContent value="my" className="mt-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <GoalsPanel employeeId={session.employeeId} canManage />
                <KpisPanel employeeId={session.employeeId} canManage={false} />
                <div className="lg:col-span-2">
                  <ReviewsPanel employeeId={session.employeeId} canManage={false} isSelf />
                </div>
              </div>
            </TabsContent>
          )}

          {showTeamTab && (
            <TabsContent value="team" className="mt-4">
              <TeamPerformance />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
