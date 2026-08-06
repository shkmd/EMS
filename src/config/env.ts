import { z } from "zod"

// Docker Compose's `${VAR:-}` substitution passes an env var through as an
// empty string when it's unset in .env, not as a genuinely absent key —
// which fails z.string().min(n).optional() (empty string still "is
// present", just too short) even though the intent was "not configured".
// Treat "" the same as absent for every optional secret below, or an
// unconfigured optional feature crashes EVERY request that calls getEnv(),
// not just the feature that needed it (this took down login in production).
function optionalEnvString(schema: z.ZodString) {
  return z.preprocess((v) => (v === "" ? undefined : v), schema.optional())
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),

  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  // z.coerce.boolean() would coerce the literal string "false" to `true`
  // (any non-empty string is JS-truthy) — compare explicitly instead.
  SMTP_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_NAME: z.string().default("EMS"),
  SMTP_FROM_EMAIL: z.string().default("no-reply@ems.local"),

  UPLOAD_DIR: z.string().default("./storage/uploads"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(10),

  SEED_SUPER_ADMIN_EMAIL: z.email().default("admin@ems.local"),
  SEED_SUPER_ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),

  // Shared secret the biometric-device bridge script authenticates with
  // (machine-to-machine — no user session available on an unattended PC).
  BIOMETRIC_SYNC_API_KEY: optionalEnvString(z.string().min(16)),

  // TURN server (coturn) for WebRTC calling — TURN_SECRET must match
  // coturn's static-auth-secret exactly; TURN_HOST is the public
  // hostname/IP it's reachable at. Both optional: calling is disabled
  // (no ICE servers returned) if unset.
  TURN_SECRET: optionalEnvString(z.string().min(16)),
  TURN_HOST: optionalEnvString(z.string()),
})

type Env = z.infer<typeof envSchema>

let cachedEnv: Env | undefined

/**
 * Parses and validates process.env once, lazily. Failing fast here (instead
 * of at first unrelated usage) surfaces misconfiguration immediately.
 *
 * Node runtime only — do not import this from `middleware.ts` or anything
 * it pulls in. Next's Edge bundler only inlines env vars it can statically
 * detect as `process.env.NAME` in source; passing the whole `process.env`
 * object to zod (as we do here) defeats that detection, so edge code must
 * read its secrets directly (see `src/lib/jwt.ts`).
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv

  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error("Invalid environment variables:", z.flattenError(parsed.error).fieldErrors)
    throw new Error("Invalid environment variables")
  }

  cachedEnv = parsed.data
  return cachedEnv
}
