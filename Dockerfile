# Bun only manages dependencies; NestJS is compiled and run with Node.js.
FROM oven/bun:1-alpine AS bun-source

FROM node:24-alpine AS deps
WORKDIR /app
COPY --from=bun-source /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY tsconfig*.json ./
COPY src ./src
RUN bun run build

FROM node:24-alpine AS production-deps
WORKDIR /app
COPY --from=bun-source /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node --from=production-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
