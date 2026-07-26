import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/features/auth/session";
import { canManageAssets } from "@/features/assets/authorization";
import { listMyAssetAssignments } from "@/features/assets/queries";
import { AssetsTable } from "@/features/assets/components/assets-table";
import { ASSET_CATEGORY_LABELS, ASSIGNMENT_STATUS_BADGE } from "@/features/assets/lib/labels";

export const metadata: Metadata = { title: "Assets | EMS" };

export default async function AssetsPage() {
  const session = await requireSession();
  const canManage = canManageAssets(session.role);
  const hasEmployeeProfile = !!session.employeeId;

  const myAssignments = session.employeeId ? await listMyAssetAssignments(session.employeeId) : [];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
        <p className="text-sm text-muted-foreground">Track company assets and their assignment history.</p>
      </div>

      {!hasEmployeeProfile && !canManage ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Your account isn&apos;t linked to an employee profile, so there&apos;s no asset data to show here.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={canManage ? "manage" : "my"}>
          <TabsList>
            {canManage && <TabsTrigger value="manage">Inventory</TabsTrigger>}
            {hasEmployeeProfile && <TabsTrigger value="my">My Assets</TabsTrigger>}
          </TabsList>

          {canManage && (
            <TabsContent value="manage" className="mt-4">
              <AssetsTable />
            </TabsContent>
          )}

          {hasEmployeeProfile && (
            <TabsContent value="my" className="mt-4">
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead>Returned</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No assets have been issued to you.
                        </TableCell>
                      </TableRow>
                    ) : (
                      myAssignments.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">
                            {a.asset.assetTag} — {a.asset.name}
                          </TableCell>
                          <TableCell>{ASSET_CATEGORY_LABELS[a.asset.category] ?? a.asset.category}</TableCell>
                          <TableCell>{new Date(a.issuedDate).toLocaleDateString()}</TableCell>
                          <TableCell>{a.returnDate ? new Date(a.returnDate).toLocaleDateString() : "—"}</TableCell>
                          <TableCell>{a.condition ?? "—"}</TableCell>
                          <TableCell>
                            <Badge className={ASSIGNMENT_STATUS_BADGE[a.status]}>{a.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
