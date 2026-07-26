import bcrypt from "bcryptjs"
import { createHash, randomBytes } from "node:crypto"

const SALT_ROUNDS = 12

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}

/**
 * Hashes opaque tokens (password reset, refresh) before persisting them.
 * SHA-256 is sufficient here since these are high-entropy random tokens,
 * not user-chosen secrets — bcrypt's slow KDF would be wasted cost.
 */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

/** Generates a high-entropy opaque token for refresh/reset flows. */
export function generateOpaqueToken() {
  return randomBytes(32).toString("hex")
}

const TEMP_PASSWORD_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%"

/** Generates a random, human-typeable temporary password for admin-provisioned accounts. */
export function generateTemporaryPassword(length = 12) {
  const bytes = randomBytes(length)
  let password = ""
  for (let i = 0; i < length; i++) {
    password += TEMP_PASSWORD_CHARSET[bytes[i]! % TEMP_PASSWORD_CHARSET.length]
  }
  return password
}
