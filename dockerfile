# ---------- Base ----------
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Helpful for native deps & musl environments
RUN apk add --no-cache libc6-compat

# ---------- Deps (install all deps; lockfile can be regenerated) ----------
FROM base AS deps
# Toolchain for native modules like better-sqlite3/sharp when prebuilds aren't used
RUN apk add --no-cache --virtual .build-deps python3 make g++ pkgconf
COPY package*.json ./
# Use npm install (not ci) so mismatched lockfiles don't break the build
RUN npm install

# ---------- Build ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- Runtime (prod-only, slim) ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Keep runtime small: start from a clean layer
COPY package*.json ./
# Bring over deps and then prune devDependencies out
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev && npm cache clean --force

# Bring the built app (no source needed)
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/tidecloak.json ./tidecloak.json:

# Use the non-root 'node' user provided by the base image
USER node

EXPOSE 3000
# package.json "start" should be:  "next start -p 3000"
CMD ["npm", "start"]
