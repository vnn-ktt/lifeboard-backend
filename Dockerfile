
# Bun для установки зависимостей
FROM oven/bun:1-alpine AS bun

# Сборка приложения
FROM node:24-alpine AS build

WORKDIR /app

# Копируем Bun из официального образа
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

# Устанавливаем зависимости по lock-файлу
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Копируем исходники
COPY tsconfig*.json ./
COPY src ./src

# Компилируем TypeScript
RUN bun run build

# Удаляем devDependencies
RUN bun prune --production

# Production
FROM node:24-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY --chown=node:node --from=build /app/package.json ./package.json
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
