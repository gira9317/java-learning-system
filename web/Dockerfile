# 画面（Next.js）。実行に必要なファイルだけをまとめた standalone で動かす
FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# ブラウザからの /api/* の転送先はビルド時に組み込まれるため、ビルド時にも指定する
ARG API_URL=http://api:4000
ENV API_URL=$API_URL
# prebuild で Monaco Editor のファイルを public/monaco にコピーしてからビルドする
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
ARG API_URL=http://api:4000
ENV API_URL=$API_URL
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
