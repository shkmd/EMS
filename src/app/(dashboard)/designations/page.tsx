import type { Metadata } from "next";

import { requireSession } from "@/features/auth/session";
import { canManageDesignations } from "@/features/designations/authorization";
import { listDesignations } from "@/features/designations/queries";
import { DesignationsClient } from "@/features/designations/components/designations-client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Designations | EMS" };

export default async function DesignationsPage() {
  const session = await requireSession();
  const canManage = canManageDesignations(session.role);

  const [designations, departments] = await Promise.all([
    listDesignations(),
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Designations</h1>
        <p className="text-sm text-muted-foreground">Manage job titles across departments.</p>
      </div>

      <DesignationsClient designations={designations} departments={departments} canManage={canManage} />
    </div>
  );
}
