import type { Egg } from "@/components/easter-badges";
import { request, type RequestOptions } from "./client";

// イースターエッグ（CTF 風の隠し要素）

/** クリアしたバッジと、その日時 */
export type SolvedEggs = Partial<Record<Egg, string>>;
export type FlagResult = { egg: Egg | null; solved: SolvedEggs };

// GET /easter
export async function getSolvedEggs(options: Pick<RequestOptions, "cookie"> = {}): Promise<SolvedEggs> {
  const { solved } = await request<{ solved: SolvedEggs }>("/easter", options);
  return solved;
}

// POST /easter/flag
export async function submitFlag(flag: string): Promise<FlagResult> {
  return request<FlagResult>("/easter/flag", { method: "POST", body: { flag } });
}
