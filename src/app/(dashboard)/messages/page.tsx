import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/features/auth/session";
import { listConversations } from "@/features/messaging/queries";
import { MessagesApp } from "@/features/messaging/components/messages-app";

export const metadata: Metadata = { title: "Messages | EMS" };

export default async function MessagesPage() {
  const session = await requireSession();

  if (!session.employeeId) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground">Direct messages with your colleagues.</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Your account isn&apos;t linked to an employee profile, so there&apos;s no messaging available here.
          </CardContent>
        </Card>
      </div>
    );
  }

  const conversationsRaw = await listConversations(session.employeeId);
  const conversations = conversationsRaw.map((c) => ({
    ...c,
    updatedAt: c.updatedAt.toISOString(),
    lastMessage: c.lastMessage ? { ...c.lastMessage, createdAt: c.lastMessage.createdAt.toISOString() } : null,
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">Direct messages with your colleagues.</p>
      </div>
      <MessagesApp initialConversations={conversations} currentEmployeeId={session.employeeId} />
    </div>
  );
}
