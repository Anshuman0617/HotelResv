# syntax=docker/dockerfile:1
# ---- deps: install node_modules (also the base for dev mode) ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Retries + a persistent npm cache so slow or flaky networks don't fail the build
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund \
      --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

# ---- builder: production build ----
FROM node:20-alpine AS builder
WORKDIR /app
# Baked into the client bundle at build time; the browser calls this URL,
# so it must be reachable from the host (not the "backend" service name).
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runner: minimal standalone server ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
