# Используем полный образ Node.js
FROM node:18-slim

# Устанавливаем инструменты сборки (необходимы для mediasoup)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем файлы с зависимостями
COPY package*.json ./

# Устанавливаем ВСЕ зависимости (и dependencies, и devDependencies)
RUN npm install

# Копируем исходный код сервера
COPY server.ts .
# Если есть tsconfig.json — тоже скопируйте
COPY tsconfig.json .

# Порт для Socket.IO
EXPOSE 5000
# Диапазон портов для медиапотоков (UDP)
EXPOSE 40000-40100/udp

# Запускаем сервер через ts-node
CMD ["npx", "ts-node", "server.ts"]