import { NextResponse, type NextRequest } from "next/server"

import { verifyAccessToken } from "@/lib/jwt"
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/features/auth/constants"

// Paths reachable without a session. Everything else requires a valid
// access token cookie.
const PUBLIC_PAGE_PATHS = ["/login", "/forgot-password", "/reset-password"]
const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  // Not actually public — called unattended by the office biometric bridge
  // script, which has no session cookie. Authenticated by its own shared
  // API-key check (see assertValidApiKey in the route handler) instead.
  "/api/integrations/biometric/punch",
  // The company logo is shown on the public login page and in the sidebar
  // for every user — GET has no sensitive data. POST still requires a
  // session via requireSession() inside the route handler itself.
  "/api/settings/logo",
]

function isPublicPath(pathname: string) {
  if (pathname === "/") return true
  if (PUBLIC_PAGE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true
  if (PUBLIC_API_PATHS.some((p) => pathname === p)) return true
  return false
}

function attachCookies(res: NextResponse, cookies: string[] | null) {
  if (cookies) {
    for (const cookie of cookies) res.headers.append("set-cookie", cookie)
  }
  return res
}

// Swaps one cookie's value within a raw `Cookie` request-header string,
// so a request that gets silently refreshed mid-middleware can be forwarded
// downstream carrying the NEW access token — without this, NextResponse.next()
// would still hand the page/API route the original (expired) cookie, since
// Set-Cookie on the response only affects the browser's *next* request.
function withCookieValue(originalHeader: string | null, name: string, value: string) {
  const parts = (originalHeader ?? "")
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith(`${name}=`))
  parts.push(`${name}=${value}`)
  return parts.join("; ")
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isApiRoute = pathname.startsWith("/api")

  const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  let session = token ? await verifyAccessToken(token).catch(() => null) : null
  let refreshedCookies: string[] | null = null
  let forwardHeaders = req.headers

  // The access token is short-lived by design (15 min). Rather than bounce
  // an actively-working user to /login the moment it expires, silently
  // refresh here — via the existing /api/auth/refresh route, since that's
  // where the DB-backed refresh-token rotation logic lives (Prisma isn't
  // available in this Edge middleware) — as long as their 7-day refresh
  // cookie is still valid. A hard logout should mean "actually signed out
  // or the refresh token itself expired," not "left a tab open too long."
  if (!session && !isPublicPath(pathname) && req.cookies.get(REFRESH_TOKEN_COOKIE)?.value) {
    const refreshRes = await fetch(new URL("/api/auth/refresh", req.url), {
      method: "POST",
      headers: { cookie: req.headers.get("cookie") ?? "" },
    }).catch(() => null)

    if (refreshRes?.ok) {
      refreshedCookies = refreshRes.headers.getSetCookie()
      const newAccessToken = refreshedCookies
        .find((c) => c.startsWith(`${ACCESS_TOKEN_COOKIE}=`))
        ?.split(";")[0]
        ?.slice(ACCESS_TOKEN_COOKIE.length + 1)
      session = newAccessToken ? await verifyAccessToken(newAccessToken).catch(() => null) : null

      if (newAccessToken) {
        forwardHeaders = new Headers(req.headers)
        forwardHeaders.set("cookie", withCookieValue(req.headers.get("cookie"), ACCESS_TOKEN_COOKIE, newAccessToken))
      }
    }
  }

  // Signed-in users shouldn't see the auth pages again.
  if (session && PUBLIC_PAGE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  if (!session) {
    if (isApiRoute) {
      return attachCookies(
        NextResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
          { status: 401 }
        ),
        refreshedCookies
      )
    }
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("redirect", pathname)
    return attachCookies(NextResponse.redirect(loginUrl), refreshedCookies)
  }

  return attachCookies(NextResponse.next({ request: { headers: forwardHeaders } }), refreshedCookies)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
}
