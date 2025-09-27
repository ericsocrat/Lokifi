FROM node:20.19-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ git
# Use npm ci for reproducible installs and allow legacy peer deps to avoid ERESOLVE in older lockfiles
RUN npm ci --legacy-peer-deps
RUN npm cache clean --force

FROM node:20.19-alpine AS dev
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

FROM node:20.19-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20.19-alpine AS prod
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3000
RUN chown -R node:node /app
USER node
CMD ["npm", "run", "start"]
