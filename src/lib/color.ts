/** Picks a readable foreground (near-black or white) for a given hex background,
 * using perceptual luminance so branded primary colors stay legible as button text. */
export function foregroundForHex(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? "#111111" : "#ffffff"
}

/** Mixes a hex color with white to produce a light "soft" tint suitable for
 * icon-chip backgrounds behind the same-colored foreground text/icon. */
export function softTintForHex(hex: string, amount = 0.12): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const mix = (channel: number) => Math.round(channel * amount + 255 * (1 - amount))
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0")
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}
