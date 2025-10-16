FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ git
# Use npm ci for reproducible installs and allow legacy peer deps to avoid ERESOLVE in older lockfiles
RUN npm ci --legacy-peer-deps
RUN npm cache clean --force

FROM node:22-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development
ENV WATCHPACK_POLLING=true
RUN chown -R node:node /app
USER node
CMD ["npm", "run", "dev"]

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Debug: List directory structure to verify files are copied
RUN echo "=== Checking directory structure ===" && \
    ls -la && \
    echo "=== Checking app directory ===" && \
    ls -la app/ 2>/dev/null || echo "No app directory found" && \
    echo "=== Checking for alerts page ===" && \
    ls -la app/alerts/ 2>/dev/null || echo "No alerts directory found"
# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
RUN npm run build

FROM node:22-alpine AS prod
WORKDIR /app

# Copy standalone output
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Copy package.json for runtime
COPY --from=build /app/package.json ./

EXPOSE 3000
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs /app

USER nextjs

CMD ["node", "server.js"]
