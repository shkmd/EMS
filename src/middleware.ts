import { NextResponse, type NextRequest } from "next/server"

import { verifyAccessToken } from "@/lib/jwt"
import { ACCESS_TOKEN_COOKIE } from "@/features/auth/constants"

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
]

function isPublicPath(pathname: string) {
  if (pathname === "/") return true
  if (PUBLIC_PAGE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true
  if (PUBLIC_API_PATHS.some((p) => pathname === p)) return true
  return false
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isApiRoute = pathname.startsWith("/api")

  const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  const session = token ? await verifyAccessToken(token).catch(() => null) : null

  // Signed-in users shouldn't see the auth pages again.
  if (session && PUBLIC_PAGE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  if (!session) {
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      )
    }
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
}
