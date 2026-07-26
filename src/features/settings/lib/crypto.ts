import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

import { getEnv } from "@/config/env"

const ALGORITHM = "aes-256-gcm"

/** Derives a stable 32-byte key from JWT_SECRET so no separate secret is needed. */
function getKey() {
  return createHash("sha256").update(getEnv().JWT_SECRET).digest()
}

/** Encrypts a secret (e.g. SMTP password) for storage. Format: iv:authTag:ciphertext, all base64. */
export function encryptSecret(plain: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":")
}

export function decryptSecret(encoded: string) {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(":")
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error("Malformed encrypted secret")

  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"))
  const plain = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()])
  return plain.toString("utf8")
}
