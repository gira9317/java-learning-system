# API サーバー（Hono）。起動時にマイグレーション・初期データ・講義の資料の取り込みを行ってから起動する
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY db ./db
COPY content ./content
USER node
EXPOSE 4000
# どれも何度実行してもよい（作成済みのデータは上書きしない）
CMD ["sh", "-c", "node dist/scripts/migrate.js && node dist/scripts/seed.js && node dist/scripts/import-lectures.js && exec node dist/src/index.js"]
