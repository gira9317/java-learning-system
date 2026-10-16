// API サーバー（../api）を呼ぶ共通処理。
// - ブラウザからは /api/...（next.config.ts の rewrites で API サーバーへ転送。同じオリジンなのでクッキーがそのまま付く）
// - サーバー（Server Component）からは API サーバーへ直接送る。クッキーは呼び出し側から受け取って付ける
const BASE_URL = typeof window === "undefined" ? (process.env.API_URL ?? "http://localhost:4000") : "/api";

/** API が 2xx 以外を返したときのエラー。message は API が返した日本語のメッセージ */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: { message?: string; code?: string; fieldErrors?: Record<string, string[]> } | null,
  ) {
    super(message);
  }
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Server Component から呼ぶときに、受け取ったリクエストの Cookie ヘッダーを渡す */
  cookie?: string;
};

export async function request<T>(path: string, { method = "GET", body, cookie }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.cookie = cookie;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, json?.message ?? "通信に失敗しました", json);
  }
  return json as T;
}
