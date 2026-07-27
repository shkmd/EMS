import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Lets page components call forbidden()/unauthorized() from
  // next/navigation for role-gated pages, rendering a proper forbidden.tsx
  // instead of throwing — thrown errors get their message redacted by
  // Next in production, which meant every role check that did
  // `throw new ForbiddenError()` showed generic "Server Components render"
  // boilerplate instead of a real "you don't have access" message.
  experimental: {
    authInterrupts: true,
  },

  async headers() {
    return [
      {
        // Applies to every route — pages and API alike.
        source: "/:path*",
        headers: [
          // Prevents the app from being framed by another origin
          // (clickjacking). No legitimate use case here needs framing.
          { key: "X-Frame-Options", value: "DENY" },
          // Stops the browser from MIME-sniffing responses into a
          // different content type than declared (e.g. treating an
          // uploaded document as HTML).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Sends the full referrer only to our own origin; cross-origin
          // navigations only get the origin, not the full path/query.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disables browser features this app never uses.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // HSTS: only meaningful once actually served over HTTPS (e.g.
          // behind a TLS-terminating proxy in production); harmless as a
          // no-op over plain HTTP in local dev.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },

  // A strict Content-Security-Policy is deliberately not set here yet:
  // Radix UI (Select/Dropdown/Popover/Dialog/Tooltip — used throughout this
  // app) positions floating elements via inline `style` attributes, which a
  // CSP without `style-src 'unsafe-inline'` would silently break across the
  // whole UI. Adding CSP safely needs a full manual pass clicking through
  // every dropdown/select/dialog to confirm nothing regresses, which wasn't
  // possible to do here without a browser. Do that pass before adding one.
};

export default nextConfig;
