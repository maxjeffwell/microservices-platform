# Multi-stage build for Auth Service

# Stage 1: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY services/platform/auth-service/package*.json ./services/platform/auth-service/

# Copy shared libraries
COPY shared ./shared

# Install dependencies for shared libraries
RUN cd shared/errors && npm install --omit=dev && \
    cd ../logger && npm install --omit=dev && \
    cd ../middleware && npm install --omit=dev && \
    cd ../utils && npm install --omit=dev

# Copy auth service source code
COPY services/platform/auth-service ./services/platform/auth-service

# Install dependencies for auth service
WORKDIR /app/services/platform/auth-service
RUN npm install --omit=dev

# Stage 2: Runtime
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy auth service
COPY --from=builder --chown=nodejs:nodejs /app/services/platform/auth-service ./

# Copy shared libraries into node_modules/@platform
RUN mkdir -p node_modules/@platform
COPY --from=builder --chown=nodejs:nodejs /app/shared/errors ./node_modules/@platform/errors
COPY --from=builder --chown=nodejs:nodejs /app/shared/logger ./node_modules/@platform/logger
COPY --from=builder --chown=nodejs:nodejs /app/shared/middleware ./node_modules/@platform/middleware
COPY --from=builder --chown=nodejs:nodejs /app/shared/utils ./node_modules/@platform/utils

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start the service
CMD ["node", "index.js"]
