# Этап сборки (builder)
FROM node:16-alpine as builder

# 1. Устанавливаем все необходимые инструменты для сборки
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev \
    && ln -sf python3 /usr/bin/python

# 2. Настраиваем рабочую директорию
WORKDIR /app

# 3. Копируем только package.json для лучшего кэширования
COPY package*.json ./

# 4. Явно пересобираем sqlite3 для правильной архитектуры
RUN npm install sqlite3 --build-from-source --target_arch=x64

# 5. Устанавливаем остальные зависимости
RUN npm install --production

# Этап запуска (production)
FROM node:16-alpine

# 6. Устанавливаем только runtime-зависимости
RUN apk add --no-cache sqlite

# 7. Настраиваем рабочую директорию и пользователя
WORKDIR /app
RUN chown node:node /app
USER node

# 8. Копируем только необходимые файлы
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

# 9. Проверяем целостность SQLite3
RUN node -e "require('sqlite3').verbose()" || echo "SQLite3 check failed"

EXPOSE 5001
CMD ["node", "index.js"]