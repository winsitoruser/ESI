# ===========================================
# Bedagang ERP — Next.js Docker Build
# ===========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps --no-optional

# Copy source & build
COPY tsconfig.json next.config.mjs ./
COPY public ./public
COPY .env.example .env.example
COPY components.json postcss.config.js tailwind.config.js ./
COPY server.js ./
COPY lib ./lib
COPY models ./models
COPY pages ./pages
COPY prisma ./prisma
COPY public ./public
COPY scripts ./scripts
COPY styles ./styles
COPY components ./components
COPY contexts ./contexts
COPY hooks ./hooks
COPY utils ./utils
COPY types ./types
COPY middleware.ts ./

# Build for production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# ===========================================
# Production runner
# ===========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output from builder
COPY --from=builder /app/.next/standalone ./

# Copy static files (needed by standalone server)
COPY --from=builder /app/.next/static ./.next/static

# Copy public assets
COPY --from=builder /app/public ./public

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000

# Default health check — overridable per service via PORT
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

CMD ["node", "server.js"]
