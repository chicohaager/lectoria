# Multi-stage Docker build for Lectoria BookManager
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

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S lectoria -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application from builder
COPY --from=builder --chown=lectoria:nodejs /app .

# Create directories with correct permissions
RUN mkdir -p uploads data frontend/build public && \
    chown -R lectoria:nodejs /app && \
    chmod -R 755 /app

# Switch to non-root user
USER lectoria

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start application with dumb-init
CMD ["dumb-init", "node", "backend_server.js"]