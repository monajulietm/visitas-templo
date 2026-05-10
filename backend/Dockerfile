# Render-compatible image for the Hono + Bun + Prisma backend.
# Render auto-detects this Dockerfile when the service's root directory is /backend.

FROM oven/bun:1.1-debian AS base
WORKDIR /app

# OpenSSL is needed by Prisma's query engine binaries.
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install dependencies first (cached layer).
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Copy the rest, then generate the Prisma client.
COPY . .
RUN bunx prisma generate

ENV PORT=3000
EXPOSE 3000

# On boot: push the schema to whatever Postgres DATABASE_URL points at, then start.
CMD ["sh", "-c", "bunx prisma db push --skip-generate --accept-data-loss && bun run src/index.ts"]
