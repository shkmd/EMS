import { Building2 } from "lucide-react";

import { getCompanySettings } from "@/features/settings/queries";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getCompanySettings();

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/settings/logo" alt={settings.companyName} className="h-12 max-w-48 object-contain" />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Building2 className="size-6" />
            </div>
          )}
          <span className="text-lg font-semibold">{settings.companyName}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
