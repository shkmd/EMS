FROM node:20-alpine AS base

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ---- Build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_ vars are inlined into the client bundle at build time, not
# read from the runtime container's environment — must be a build ARG.
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
RUN npx prisma generate
# The build host is memory-constrained; Next.js's default V8 heap ceiling
# (~1GB) is no longer enough for this codebase's compile step. This only
# affects the build stage — the runtime image starts a fresh stage below
# and does not inherit it.
ENV NODE_OPTIONS=--max-old-space-size=1536
RUN npm run build

# ---- Runtime ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# Platforms without Compose's "run migrate service, then start app" ordering
# (e.g. Railway) instead run migrations from this image's own start command
# (see railway.json). The standalone output above only traces what the
# Next.js server itself needs, so `prisma` and `tsx` (devDependencies, CLI
# tools, never imported by app code) aren't in it — pull in the full
# node_modules so those CLIs exist here too.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
