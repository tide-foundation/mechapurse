# ---- Base image (Alpine) ----
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Helps with some native deps (e.g., sharp) on Alpine
RUN apk add --no-cache libc6-compat

# ---- Deps stage: install ALL deps (incl. dev) for building ----
FROM base AS deps
COPY package*.json ./
RUN npm ci
# Ensure TypeScript exists if you have next.config.ts but no TS in devDeps
RUN node -e "try{require.resolve('typescript')}catch(e){process.exit(1)}" || npm i -D typescript

# ---- Build stage ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build your Next app (uses dev deps from deps stage)
RUN npm run build

# ---- Runtime stage: production-only, non-root ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Install ONLY production deps into a clean layer
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Bring over the built app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Run as the precreated non-root 'node' user from the Node image
USER node

# Informational (Azure Container Apps will map this)
EXPOSE 3000

# Optional healthcheck: uncomment after you add /healthz
# HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
#   CMD wget -qO- http://127.0.0.1:${PORT}/healthz || exit 1

# Start the app. Your package.json "start" should be "next start -p 3000"
CMD ["npm", "start"]
