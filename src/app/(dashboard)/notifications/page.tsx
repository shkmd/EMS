import type { Metadata } from "next";

import { NotificationsList } from "@/features/notifications/components/notifications-list";

export const metadata: Metadata = { title: "Notifications | EMS" };

export default function NotificationsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">Your full notification history.</p>
      </div>

      <NotificationsList />
    </div>
  );
}
