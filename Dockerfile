FROM node:20-alpine

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build to reduce image size
RUN npm prune --omit=dev

# Create data directory for SQLite
RUN mkdir -p data logs

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('fs').existsSync('data/optimizer.db') && process.exit(0) || process.exit(1)"

# Run the application
CMD ["npm", "start"]

# Dockerfile updated Thu Dec 11 15:32:50 GMT 2025
