import type { MetadataRoute } from "next"

import { getCompanySettings } from "@/features/settings/queries"

// Reads CompanySettings on every request (same reason as app/layout.tsx):
// prerendering this at build time would either fail outright (DATABASE_URL
// isn't available during the Docker build stage in production) or bake in
// whatever branding existed at build time instead of updating live.
export const dynamic = "force-dynamic"

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getCompanySettings()
  const themeColor = settings.primaryColor && /^#[0-9a-fA-F]{6}$/.test(settings.primaryColor) ? settings.primaryColor : "#111827"

  return {
    name: `${settings.companyName} | EMS`,
    short_name: settings.companyName || "EMS",
    description: "Employee Management System — employees, attendance, leave, payroll and more.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: themeColor,
    icons: [
      // The company's own uploaded logo, when there is one — /api/settings/logo
      // 404s otherwise, so it's listed after the bundled fallback below rather
      // than as the only icon (a manifest with only a 404ing icon can block
      // "Add to Home Screen" in some browsers).
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      ...(settings.logoUrl ? [{ src: "/api/settings/logo", sizes: "any", type: "image/png" }] : []),
    ],
  }
}
