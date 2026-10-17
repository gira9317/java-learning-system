import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  // Docker イメージでは、実行に必要なファイルだけをまとめた standalone で出力する（Dockerfile で NEXT_OUTPUT を指定）
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  cacheComponents: true,
  partialPrefetching: true,
  // ブラウザからの /api/* を API サーバー（../api）へ転送する。
  // 画面と同じオリジンに見えるので、CORS の設定なしでクッキーがそのまま使える。
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL ?? "http://localhost:4000"}/:path*`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
