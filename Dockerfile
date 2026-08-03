# Multi-stage build for the Graybridge Next.js storefront.
#
# Debian-based ("bookworm-slim") rather than Alpine on purpose: Prisma's
# native tooling has a long history of glibc/musl friction on Alpine
# (query engine binary mismatches, missing libssl, etc). This project
# uses Prisma 7's driver adapters (@prisma/adapter-pg over `pg`) rather
# than Prisma's traditional bundled query engine, which sidesteps most of
# that — but slim-over-alpine is still the safer, more boring default,
# and the size difference doesn't matter much for a single-app VPS
# deployment.
#
# Build:  docker build -t graybridge .
# Run:    docker run -p 3000:3000 --env-file .env.production graybridge
#
# Database migrations are NOT run automatically on container start (see
# CMD at the bottom), and the final runner image below deliberately does
# NOT include the `prisma` CLI or full node_modules (that's the point of
# `output: "standalone"` — only traced runtime deps are copied in). Run
# migrations as a separate, explicit step against the target database,
# using the `builder` stage (which has the full toolchain) instead:
#   docker build --target builder -t graybridge:migrate .
#   docker run --rm --env-file .env.production graybridge:migrate \
#     npx prisma migrate deploy
# Keeping this out of the runner image's normal startup avoids multiple
# replicas (or a restart loop) all racing to apply migrations at once.

FROM node:20-bookworm-slim AS base
# bookworm-slim doesn't include libssl by default, and Prisma's tooling
# (schema/generate-time engines) warns without it — install it once here
# so every stage built from `base` has it.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# ---- deps: install exact locked dependencies -------------------------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: generate the Prisma client + build the Next.js app -----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# lib/prisma.ts constructs its Postgres adapter at module load time, and
# `next build`'s page-data collection step imports every route module
# (including ones that import lib/prisma.ts) to inspect their exports —
# so DATABASE_URL must be *present* (syntactically, not necessarily
# reachable) at build time or the build itself fails, even though no
# real query runs during the build. `pg`'s Pool connects lazily on first
# query, so this placeholder never actually needs to work — it's
# overridden by the real DATABASE_URL passed to `docker run` at runtime
# (ENV here only affects this build stage, not the final image below).
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate
RUN npm run build

# ---- runner: minimal production image ---------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# `output: "standalone"` (next.config.mjs) traces and bundles just the
# runtime dependencies actually needed into .next/standalone — no need
# to copy the full node_modules tree in here.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# scripts/check-env.mjs isn't imported by any app code (it's a pre-start
# check invoked directly, see package.json), so Next's file tracing
# doesn't pick it up automatically — copy it in explicitly.
COPY --from=builder /app/scripts ./scripts

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# check-env.mjs fails fast (clear message, non-zero exit) if
# DATABASE_URL/AUTH_SECRET aren't set, before server.js ever starts.
CMD ["/bin/sh", "-c", "node scripts/check-env.mjs && node server.js"]
