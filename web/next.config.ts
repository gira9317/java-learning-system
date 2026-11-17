import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Content-Security-Policy。読み込めるものを自分のサイト中心に絞り、XSS が起きても被害を広げにくくする。
// - script/style の 'unsafe-inline': Next.js が埋め込むスクリプトと、React Flow・Monaco のインラインスタイルに必要
//   （nonce 方式にするとページが毎回動的レンダリングになるため、ここでは使わない）
// - 'unsafe-eval' は開発時だけ（React のデバッグ情報に必要）
// - worker-src blob:: Monaco Editor が Worker を blob: の URL から作る
// - frame-src / media-src https:: 講義動画（YouTube や社内動画サービスの埋め込み・動画ファイル）
// - img-src https:: 講義資料（Markdown）の外部画像
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src https:",
  "media-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // 古いブラウザ向けのクリックジャッキング対策（CSP の frame-ancestors と同じ意味）
  { key: "X-Frame-Options", value: "DENY" },
  // Content-Type を推測させない
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 別サイトへ移るときは、オリジンだけを伝える
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 使わない機能は止めておく
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
