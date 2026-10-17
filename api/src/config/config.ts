function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

export const isProduction = process.env.NODE_ENV === "production";

// セッションのクッキーに Secure を付けるか。既定は本番のとき。HTTPS なしで見るデモ環境では COOKIE_SECURE=false にする
export const cookieSecure = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : isProduction;

export const port = Number(getEnv("PORT", "4000"));

export const databaseUrl = getEnv("DATABASE_URL", "postgresql://app:app@localhost:5432/java_learning");

// 画面（web）のオリジン。CSRF 対策で、状態を変えるリクエストの Origin と照合する
export const webOrigin = getEnv("WEB_ORIGIN", "http://localhost:3000");

// 実行サーバー（../runner）。RUNNER_TOKEN は実行サーバーと同じ値にする
export const runnerUrl = getEnv("RUNNER_URL", "http://localhost:5000");
export const runnerToken = getEnv("RUNNER_TOKEN", "dev-runner-token");

// セッションの有効期限
export const SESSION_DAYS_REMEMBER = 30; // 「サインインしたままにする」
export const SESSION_HOURS_DEFAULT = 12; // それ以外（ブラウザを閉じるとクッキーも消える）
