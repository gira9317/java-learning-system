// 試行回数の制限。サーバー 1 台を前提に、回数はメモリに持つ（再起動で消える）。
// サーバーを複数台にするときは、Redis や DB に置き換える。
const counters = new Map<string, { count: number; resetAt: number }>();

export const rateLimit = (key: string, limit: number, windowSeconds: number) => {
  const now = Date.now();
  const entry = counters.get(key);

  if (!entry || entry.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }

  entry.count += 1;
  return entry.count <= limit;
};

// 期限切れのキーを定期的に掃除する
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of counters) {
    if (entry.resetAt <= now) counters.delete(key);
  }
}, 60_000).unref();
