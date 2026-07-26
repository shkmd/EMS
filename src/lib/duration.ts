const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
}

/**
 * Parses short duration strings ("15m", "7d", "30s") into milliseconds.
 * Matches the subset of jose's `setExpirationTime` string grammar we use for
 * JWT expiry, so cookie maxAge / DB expiresAt stay in sync with token TTLs.
 */
export function parseDurationMs(input: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(input.trim())
  if (!match) {
    throw new Error(`Invalid duration string: "${input}"`)
  }
  const [, amount, unit] = match
  return Number(amount) * UNIT_MS[unit!]!
}
