import type { Metadata } from "next";

import { requireSession } from "@/features/auth/session";
import { listConversations } from "@/features/messaging/queries";
import { MessagesApp } from "@/features/messaging/components/messages-app";

export const metadata: Metadata = { title: "Messages | EMS" };

export default async function MessagesPage() {
  const session = await requireSession();

  const conversationsRaw = await listConversations(session.sub);
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
      <MessagesApp initialConversations={conversations} currentUserId={session.sub} />
    </div>
  );
}
