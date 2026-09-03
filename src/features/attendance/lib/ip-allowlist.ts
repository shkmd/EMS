/**
 * Checks a client IP against a vertical's configured office allowlist.
 * The allowlist is a comma/newline-separated list of exact IPs and/or IPv4
 * CIDR ranges (e.g. "203.0.113.10, 198.51.100.0/24"). A null/empty allowlist
 * means unrestricted (fail-open) — nothing breaks for verticals that haven't
 * configured this yet.
 *
 * CIDR matching is IPv4-only; an IPv6 client IP only gets exact-string
 * matching against list entries, which is acceptable since office public
 * IPs are virtually always IPv4.
 */
export function isIpAllowed(clientIp: string | null | undefined, allowlist: string | null | undefined): boolean {
  const entries = (allowlist ?? "")
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (entries.length === 0) return true
  if (!clientIp) return false

  return entries.some((entry) => (entry.includes("/") ? ipv4InCidr(clientIp, entry) : clientIp === entry))
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".")
  if (parts.length !== 4) return null

  let result = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const octet = Number(part)
    if (octet > 255) return null
    result = (result << 8) | octet
  }
  return result >>> 0
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [rangeIp, prefixLengthStr] = cidr.split("/")
  const prefixLength = Number(prefixLengthStr)
  if (!rangeIp || Number.isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) return false

  const ipInt = ipv4ToInt(ip)
  const rangeInt = ipv4ToInt(rangeIp)
  if (ipInt === null || rangeInt === null) return false

  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0
  return (ipInt & mask) === (rangeInt & mask)
}
