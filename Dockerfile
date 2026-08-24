# syntax=docker/dockerfile:1

# Stage 1: Build TypeScript
# Stage 2: Run tests and production

# ============================================
# Stage 1: Builder
# ============================================
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY test/ ./test/

# Build TypeScript
RUN npm run build

# ============================================
# Stage 2: Runner (production + tests)
# ============================================
FROM node:22-slim AS runner

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

# Expose the default port
EXPOSE 3000

# Health check using Node's built-in fetch (no curl needed in slim image)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/users').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Default command: start the server
CMD ["node", "dist/src/main.js"]

# ============================================
# Stage 3: Test runner (for CI)
# ============================================
FROM node:22-slim AS test

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (need devDependencies for tests)
RUN npm ci

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Run tests
CMD ["npm", "test"]
