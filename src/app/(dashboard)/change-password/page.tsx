import type { Metadata } from "next";

import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export const metadata: Metadata = { title: "Change password | EMS" };

export default function ChangePasswordPage() {
  return <ChangePasswordForm />;
}
