import type { Metadata } from "next";

import { requireSession } from "@/features/auth/session";
import { canManageAnnouncements } from "@/features/announcements/authorization";
import { AnnouncementsFeed } from "@/features/announcements/components/announcements-feed";

export const metadata: Metadata = { title: "Announcements | EMS" };

export default async function AnnouncementsPage() {
  const session = await requireSession();
  const canManage = canManageAnnouncements(session.role);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground">Company and department updates.</p>
      </div>

      <AnnouncementsFeed canManage={canManage} />
    </div>
  );
}
