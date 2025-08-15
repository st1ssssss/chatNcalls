# Используем официальный образ Node.js с Alpine (легковесный)
FROM node:16-alpine

# 1. Устанавливаем системные зависимости для сборки SQLite3
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# 2. Устанавливаем serve глобально
RUN npm install -g serve

# 3. Рабочая директория
WORKDIR /app

# 4. Копируем ТОЛЬКО package.json сначала
COPY package*.json ./

# 5. Устанавливаем SQLite3 с явной архитектурой
RUN npm install --build-from-source --target_arch=x64 sqlite3

# 6. Копируем остальные файлы (исключая node_modules через .dockerignore)
COPY . .

# 8. Копируем собранный dist (если сборка была отдельно)
COPY dist/ ./dist

# 9. Очищаем кеш и удаляем build-зависимости
RUN npm cache clean --force \
    && apk del python3 make g++

# 10. Открываем порт и запускаем
EXPOSE 5000
CMD ["serve", "-l", "5000", "dist"]