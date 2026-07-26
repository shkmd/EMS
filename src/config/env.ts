import { z } from "zod"

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
