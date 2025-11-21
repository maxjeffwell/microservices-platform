# Multi-stage build for Analytics Service

# Stage 1: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY services/platform/analytics-service/package*.json ./services/platform/analytics-service/

# Copy shared libraries
COPY shared ./shared

# Install dependencies for shared libraries
RUN cd shared/errors && npm install --no-workspaces && \
    cd ../logger && npm install --no-workspaces && \
    cd ../middleware && npm install --no-workspaces && \
    cd ../utils && npm install --no-workspaces

# Copy analytics service source code
COPY services/platform/analytics-service ./services/platform/analytics-service

# Install dependencies for analytics service
WORKDIR /app/services/platform/analytics-service
RUN npm install --no-workspaces

# Stage 2: Runtime
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy analytics service
COPY --from=builder --chown=nodejs:nodejs /app/services/platform/analytics-service ./

# Copy shared libraries into node_modules/@platform
RUN mkdir -p node_modules/@platform
COPY --from=builder --chown=nodejs:nodejs /app/shared/errors ./node_modules/@platform/errors
COPY --from=builder --chown=nodejs:nodejs /app/shared/logger ./node_modules/@platform/logger
COPY --from=builder --chown=nodejs:nodejs /app/shared/middleware ./node_modules/@platform/middleware
COPY --from=builder --chown=nodejs:nodejs /app/shared/utils ./node_modules/@platform/utils

# Install curl for health checks
RUN apk add --no-cache curl

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3005/health || exit 1

# Start service
CMD ["node", "index.js"]
