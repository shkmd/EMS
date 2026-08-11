import type { Metadata } from "next";
import { Inter, Roboto, Poppins, Open_Sans, Lato, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCompanySettings } from "@/features/settings/queries";
import { foregroundForHex } from "@/lib/color";

// Every preset binds to the SAME CSS variable name (--font-sans) — only the
// one matching the active branding setting is ever applied to <html>, so
// exactly one wins at runtime even though next/font bundles all of them at
// build time (the browser only fetches whichever is actually referenced).
const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
const roboto = Roboto({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "700"] });
const poppins = Poppins({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const openSans = Open_Sans({ variable: "--font-sans", subsets: ["latin"] });
const lato = Lato({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "700"] });

const FONT_VARIABLES: Record<string, string> = {
  inter: inter.variable,
  roboto: roboto.variable,
  poppins: poppins.variable,
  "open-sans": openSans.variable,
  lato: lato.variable,
};

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EMS | Employee Management System",
  description: "Modern HR management system — employees, attendance, leave, payroll and more.",
};

// The root layout now reads CompanySettings on every render so branding
// changes apply without a redeploy. That DB call can't run during `next
// build`'s static prerendering (DATABASE_URL isn't available in the build
// stage), so the whole tree must be forced dynamic rather than prerendered.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getCompanySettings();
  const activeFontVariable = FONT_VARIABLES[settings.fontFamily ?? "inter"] ?? inter.variable;
  const primaryColor = settings.primaryColor && /^#[0-9a-fA-F]{6}$/.test(settings.primaryColor) ? settings.primaryColor : null;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${activeFontVariable} ${geistMono.variable} h-full antialiased`}
    >
      {primaryColor && (
        <head>
          <style
            dangerouslySetInnerHTML={{
              __html: `:root,.dark{--primary:${primaryColor};--primary-foreground:${foregroundForHex(primaryColor)};--sidebar-primary:${primaryColor};--sidebar-primary-foreground:${foregroundForHex(primaryColor)};--ring:${primaryColor};--sidebar-ring:${primaryColor};}`,
            }}
          />
        </head>
      )}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster richColors closeButton position="top-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
