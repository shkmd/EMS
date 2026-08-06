import "server-only"

import { createHmac } from "crypto"

/**
 * Generates a short-lived TURN credential using coturn's `use-auth-secret`
 * REST API convention: username is "<expiry-unix-ts>:<label>", password is
 * base64(HMAC-SHA1(secret, username)). coturn independently recomputes the
 * same HMAC to validate — nothing is looked up or stored server-side.
 */
export function generateTurnCredentials(secret: string, label: string, ttlSeconds = 3600) {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds
  const username = `${expiry}:${label}`
  const credential = createHmac("sha1", secret).update(username).digest("base64")
  return { username, credential }
}
