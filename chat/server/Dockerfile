# Этап сборки
FROM node:16-alpine AS builder

# 1. Устанавливаем инструменты для сборки
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev \
    && ln -sf python3 /usr/bin/python

# 2. Настраиваем рабочую директорию
WORKDIR /app

# 3. Копируем package.json
COPY package*.json ./

# 4. Собираем sqlite3 и устанавливаем зависимости
RUN npm config set python /usr/bin/python3 && \
    npm install sqlite3 --build-from-source && \
    npm install --production

# Этап запуска
FROM node:16-alpine

# 5. Устанавливаем runtime зависимости
RUN apk add --no-cache sqlite

# 6. Настраиваем пользователя
WORKDIR /app
RUN chown node:node /app
USER node

# 7. Копируем ВСЁ из builder
COPY --from=builder --chown=node:node /app /app

# 8. Копируем исходный код (если не скопировался)
COPY --chown=node:node . .

# 9. Исправляем путь к node
ENV PATH /app/node_modules/.bin:$PATH

# 10. Проверяем SQLite
RUN node -e "try { const sqlite3 = require('sqlite3').verbose(); console.log('SQLite3 OK'); } catch(e) { console.error('SQLite3 error:', e.message); process.exit(1); }"

# 11. Указываем порт через переменную окружения
ENV PORT=5001
EXPOSE 5001

# 12. Запускаем
CMD ["node", "index.js"]