# Multi-stage build for Analytics Service

FROM node:18-alpine AS builder

WORKDIR /build

# Copy shared libraries to where package.json expects them
COPY shared /shared

# Install shared library dependencies
RUN cd /shared/errors && npm install --omit=dev && \
    cd /shared/logger && npm install --omit=dev && \
    cd /shared/utils && npm install --omit=dev && \
    cd /shared/middleware && npm install --omit=dev

# Create symlinks so shared libs can import each other
RUN mkdir -p /shared/middleware/node_modules/@platform && \
    ln -s /shared/errors /shared/middleware/node_modules/@platform/errors && \
    ln -s /shared/logger /shared/middleware/node_modules/@platform/logger && \
    ln -s /shared/utils /shared/middleware/node_modules/@platform/utils && \
    mkdir -p /shared/logger/node_modules/@platform && \
    ln -s /shared/errors /shared/logger/node_modules/@platform/errors

# Copy and install analytics service
COPY services/platform/analytics-service ./analytics-service
WORKDIR /build/analytics-service
RUN rm -f package-lock.json && npm install --omit=dev

# Runtime stage
FROM node:18-alpine

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy shared libraries to /shared (where file: refs point)
COPY --from=builder --chown=nodejs:nodejs /shared /shared

# Copy analytics service to /app
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /build/analytics-service ./

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs /app /shared

USER nodejs
EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

CMD ["node", "index.js"]
