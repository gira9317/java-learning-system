# 実行サーバー。ホストの Docker を使って、受講者のコードを使い捨ての JDK コンテナで動かす
FROM docker:27-cli AS docker-cli

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# docker コマンドだけを入れる（Docker 本体はホストのものを /var/run/docker.sock 経由で使う）
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/index.js"]
