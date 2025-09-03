# Professional Docker build for Lectoria BookManager
# Includes PUID/PGID support for proper file permissions
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for backend
COPY package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# Copy all source code first
COPY . .

# Install frontend dependencies and build
WORKDIR /app/frontend
RUN npm ci && npm run build

# Go back to app directory
WORKDIR /app

# Create necessary directories
RUN mkdir -p uploads data

# Production stage
FROM node:18-alpine AS production

# Install required packages for professional deployment
RUN apk add --no-cache \
    dumb-init \
    su-exec \
    shadow \
    wget \
    tzdata

# Create default app user and group (will be modified by entrypoint)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S lectoria -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application from builder
COPY --from=builder --chown=1001:1001 /app .

# Copy entrypoint script for PUID/PGID support
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create directories with default permissions (will be adjusted by entrypoint)
RUN mkdir -p uploads data logs frontend/build public && \
    chown -R 1001:1001 /app && \
    chmod -R 755 /app

# Don't switch to non-root here - entrypoint will handle this

# Expose port
EXPOSE 3000

# Health check with wget (more reliable)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Set entrypoint to handle PUID/PGID
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Default command
CMD ["dumb-init", "node", "backend_server.js"]