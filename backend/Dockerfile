# syntax=docker/dockerfile:1

FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# Copy source and run
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
USER node
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

EXPOSE 3000
CMD ["node", "src/server.js"]
