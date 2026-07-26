import type { NextResponse } from "next/server"

import { parseDurationMs } from "@/lib/duration"
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/features/auth/constants"

const isProduction = process.env.NODE_ENV === "production"

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
  }
}

export function setAuthCookies(
  res: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
  accessExpiresIn: string,
  refreshExpiresIn: string
) {
  res.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseCookieOptions(),
    maxAge: parseDurationMs(accessExpiresIn) / 1000,
  })
  res.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions(),
    maxAge: parseDurationMs(refreshExpiresIn) / 1000,
  })
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(ACCESS_TOKEN_COOKIE, "", { ...baseCookieOptions(), maxAge: 0 })
  res.cookies.set(REFRESH_TOKEN_COOKIE, "", { ...baseCookieOptions(), maxAge: 0 })
}
