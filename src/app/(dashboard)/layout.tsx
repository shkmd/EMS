import { redirect } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getSession } from "@/features/auth/session";
import { isMaintenanceModeEnabled, getCompanySettings } from "@/features/settings/queries";
import { ActivityTracker } from "@/features/activity/components/activity-tracker";
import { CallProvider } from "@/features/messaging/components/call-provider";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, maintenanceMode, companySettings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        email: true,
        role: true,
        employee: { select: { firstName: true, lastName: true, profilePhotoUrl: true } },
      },
    }),
    isMaintenanceModeEnabled(),
    getCompanySettings(),
  ]);
  if (!user) redirect("/login");

  if (maintenanceMode && user.role !== "SUPER_ADMIN") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-xl font-semibold">Under maintenance</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          EMS is temporarily unavailable while an administrator performs maintenance. Please check back shortly.
        </p>
      </div>
    );
  }

  const displayName = user.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user.email.split("@")[0]!;

  return (
    <CallProvider currentUserId={session.sub} currentUserName={displayName}>
      <SidebarProvider>
        {session.employeeId && <ActivityTracker />}
        <AppSidebar role={user.role} companyName={companySettings.companyName} hasLogo={!!companySettings.logoUrl} />
        <SidebarInset>
          <Topbar
            name={displayName}
            email={user.email}
            role={user.role}
            avatarUrl={user.employee?.profilePhotoUrl}
          />
          <main className="flex flex-1 flex-col gap-6 p-6 md:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </CallProvider>
  );
}
