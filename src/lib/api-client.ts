import type { ApiResponse } from "@/types/api"

let refreshInFlight: Promise<boolean> | null = null

async function tryRefresh() {
  if (!refreshInFlight) {
    refreshInFlight = fetch("/api/auth/refresh", { method: "POST" })
      .then((res) => res.ok)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

type ApiClientOptions = Omit<RequestInit, "body"> & { body?: unknown }

/**
 * fetch wrapper for calling our own API routes: JSON-encodes the body,
 * sends cookies, and on a 401 (expired access token) transparently calls
 * /api/auth/refresh once and retries — so callers don't need to think about
 * token expiry during normal use.
 */
export async function apiFetch<T>(url: string, options: ApiClientOptions = {}): Promise<ApiResponse<T>> {
  const { body, headers, ...rest } = options

  const doFetch = () =>
    fetch(url, {
      ...rest,
      headers: { "Content-Type": "application/json", ...headers },
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

  let res = await doFetch()

  if (res.status === 401 && url !== "/api/auth/refresh" && url !== "/api/auth/login") {
    const refreshed = await tryRefresh()
    if (refreshed) {
      res = await doFetch()
    }
  }

  return (await res.json()) as ApiResponse<T>
}
