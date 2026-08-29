import type { Metadata } from "next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/features/auth/session";
import { canManagePolicies } from "@/features/policies/authorization";
import { listPolicies } from "@/features/policies/queries";
import { PoliciesManageList } from "@/features/policies/components/policies-manage-list";
import { PolicyCatalog } from "@/features/policies/components/policy-catalog";

export const metadata: Metadata = { title: "HR Policies | EMS" };

export default async function PoliciesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireSession();
  const { tab } = await searchParams;
  const canManage = canManagePolicies(session.role);

  const visibleTabs = [...(canManage ? ["manage"] : []), "catalog"];
  const defaultTab = tab && visibleTabs.includes(tab) ? tab : canManage ? "manage" : "catalog";

  const published = await listPolicies(session);
  const catalog = published.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    version: p.version,
    requiresAcknowledgment: p.requiresAcknowledgment,
    hasAcknowledged: (p.acknowledgments?.length ?? 0) > 0,
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">HR Policies & Handbook</h1>
        <p className="text-sm text-muted-foreground">Company policies, the employee handbook, and acknowledgment tracking.</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {canManage && <TabsTrigger value="manage">Manage</TabsTrigger>}
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
        </TabsList>

        {canManage && (
          <TabsContent value="manage" className="mt-4">
            <PoliciesManageList />
          </TabsContent>
        )}
        <TabsContent value="catalog" className="mt-4">
          <PolicyCatalog policies={catalog} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
