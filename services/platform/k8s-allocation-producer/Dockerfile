# Multi-stage build for k8s-allocation-producer (same layout as analytics-service)
FROM node:20-alpine AS builder

WORKDIR /build

# Shared libraries live where the file: refs in package.json point
COPY shared /shared
RUN --mount=type=cache,target=/root/.npm \
    cd /shared/errors && npm install --omit=dev && \
    cd /shared/logger && npm install --omit=dev
RUN mkdir -p /shared/logger/node_modules/@platform && \
    ln -s /shared/errors /shared/logger/node_modules/@platform/errors

COPY services/platform/k8s-allocation-producer ./k8s-allocation-producer
WORKDIR /build/k8s-allocation-producer
RUN --mount=type=cache,target=/root/.npm \
    rm -f package-lock.json && npm install --omit=dev

# Runtime stage
FROM node:20-alpine
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder --chown=nodejs:nodejs /shared /shared
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /build/k8s-allocation-producer ./
RUN mkdir -p logs && chown -R nodejs:nodejs /app /shared
USER nodejs
EXPOSE 3006
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3006/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"
CMD ["node", "index.js"]
