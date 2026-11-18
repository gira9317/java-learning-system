"use client";

import { useState, type FormEvent } from "react";
import { submitFlag, type SolvedEggs } from "@/api/easter-api";
import { ApiError } from "@/api/client";
import { EggBadge, EggCredits, EGGS } from "@/components/easter-badges";
import { looksLikeScript, ScriptPrank } from "@/components/script-prank";
import { formatDateTime } from "@/lib/format";

export function FlagForm({ initialSolved }: { initialSolved: SolvedEggs }) {
  const [flag, setFlag] = useState("");
  const [solved, setSolved] = useState(initialSolved);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prank, setPrank] = useState<string | null>(null);
  const count = EGGS.filter((e) => solved[e.id]).length;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!flag.trim()) {
      setMessage({ ok: false, text: "フラグを入力してください。" });
      return;
    }
    if (looksLikeScript(flag)) {
      setPrank(flag);
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await submitFlag(flag.trim());
      setSolved(result.solved);
      if (result.egg) {
        const meta = EGGS.find((x) => x.id === result.egg)!;
        setMessage({ ok: true, text: `正解！「${meta.name}」のバッジを手に入れた。${meta.caption}。` });
        setFlag("");
      } else {
        setMessage({ ok: false, text: "フラグが違うみたい。JAVA{ から } までを、そのまま入力してね。" });
      }
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? e.message : "送信に失敗しました。" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {prank && <ScriptPrank payload={prank} onClose={() => setPrank(null)} />}
      <ul className="mt-8 grid grid-cols-3 gap-3" aria-label="バッジ">
        {EGGS.map((e) => (
          <li key={e.id} className="flex flex-col items-center gap-2 text-center">
            <EggBadge egg={e.id} solved={Boolean(solved[e.id])} size={56} />
            <span className="type-caption-strong">{solved[e.id] ? e.name : "???"}</span>
            {solved[e.id] && <span className="type-fine text-ink-muted-48">{formatDateTime(solved[e.id])}</span>}
          </li>
        ))}
      </ul>

      {count === EGGS.length ? (
        <p className="type-body-strong mt-8 rounded-lg bg-pearl p-5 text-center" role="status">
          全部見つけた！ おめでとう。
          <br />
          <span className="type-caption font-normal text-ink-muted-80">ほかの人には、答えをこっそり教えないでね。</span>
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
          {message && (
            <p
              role={message.ok ? "status" : "alert"}
              className={`type-caption rounded-sm px-4 py-3 ${message.ok ? "bg-pearl text-ink" : "bg-danger/10 text-danger"}`}
            >
              {message.text}
            </p>
          )}
          <div>
            <label htmlFor="flag" className="type-caption-strong mb-2 block px-1 text-ink-muted-80">
              フラグ
            </label>
            <input
              id="flag"
              name="flag"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              className="field font-mono"
              placeholder="JAVA{...}"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-primary-lg w-full" disabled={submitting}>
            {submitting ? "確認しています…" : "答え合わせ"}
          </button>
        </form>
      )}
      <div className="mt-10 border-t border-hairline pt-4 text-center">
        <EggCredits />
      </div>
    </>
  );
}
