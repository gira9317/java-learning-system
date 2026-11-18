"use client";

import { useEffect, useState } from "react";

// 入力欄にスクリプトっぽいもの（XSS の定番）を入れて送信した人への、ちょっとしたいたずら。
// 「検知しています……」→ AA でドン → 種明かしと煽り、の 3 幕。何も記録しないし、どこにも送らない。

const SCRIPT_LIKE = /<\s*\/?\s*(script|img|svg|iframe|body|a)\b|javascript\s*:|\bon[a-z]+\s*=|alert\s*\(|document\.cookie/i;

export function looksLikeScript(value: string) {
  return SCRIPT_LIKE.test(value);
}

// 2ch 風の AA。MS Pゴシック系のフォントで見る前提で描かれている
const AA = "|　　　 7\n　　　　　　　　　　　　　　　　　_,,.. -──- ､.._ 　 　 |　　 ./\n　　　　　　　　　　　　 　 ,.‐'\"´　　　　 　 　 　 ｀` ‐､| 　 /　／\n　　　　　　　　　　　　／　　　　　　　　　　　　　　　 　 /／/\n　　　　　 ,,.. -─- ､/　　　　　　　　　　　　　　　　　　　　/\n　 　 ,.‐'´　＿　　　　　　　　　　　　　　　　　　　　　　　　 ﾞｉ、\n　∠ ‐ '\"´／　　　　　　　　　　　　　　　　　　　　　　　　　　i\n　　　　 ./　　　　　　　　　　　　　　　　 　 　 　 　 　 　 　 　 |\n　　　 ./　　　　,.ｲ　　　　　　　　　　　　　　　　　　　　　　　　|\n　　　.l　　　 ／/　　　　　　,ｲ ,1　　　 |ヽ　　　　 ﾄ､　　　　　 !\n　　　i　　 ./　 i　　,　　 /l / l.l　!　 、　ﾄ､ﾞi ,ﾍへ、l ヽ.ﾄ､|、　/\n　　　l.　 /　　.|　 /|　 /-|←┼‐l、 ヽ　ﾄ、!, -─ヽ|─!-ｌ､ｉ /\n　　　 !　ｌ　　　ｌ　|　!　|､`';:‐-_､._ ヽ､l＼l-i' 　 _,_-='､\"~!　i\"ヽ\n.　　　 ヽ! 　 　 ヽ|,/lﾞ､! l（ 　(8０j`　l──|. イ8０）　 ）l.　 | ）|\n　　　　　　　　　　l.（l　　l　ｰ-‐' 　 ,!　　　l、｀ﾞ‐--‐'　l　 /\"ﾉ\n　　　　　　　　　　ヽ ヽ､._l_　　 _,.ノ　 〈>　 ヽ､._　　 _.l_／／　　　／￣￣￣￣￣￣￣￣￣￣￣￣\n　　　　　　　　 　 　 ヽ､.__,l ￣　　 　 ＿_　　　　￣ /､‐'´　　　　|\n　　　　　　　　　　　　　　　`‐ ､　　　　　　　　 , ‐'´‐-ヽ　　　 ＜　　サーバーを落とした犯人は\n　　　　　　　　　　　　　　　 _ ./l` ‐ ､.　_,. ‐''\"!＼　　　　　　　　 │　おまえだ！\n　　　　　　　　　　　　_,,.. -‐'ヽ￣ヽ,-､ｼ￣／/　 |`‐- ､.._　 　 　 ＼＿＿＿＿＿＿＿＿＿＿＿＿\n　　　　　　　　　　　/ i　　/ /＿ 7`‐ﾞ＼__.＼.　　| 　 　 i ヽ、\n　　　　 　 　 　 　 /　l　 /　　　|　/||＼　/￣　　 !　　　|　　!";

type Step = { kind: "log" | "alert" | "aa" | "punch" | "small"; text: string; wait: number };

function steps(payload: string): Step[] {
  const shown = payload.length > 40 ? `${payload.slice(0, 40)}…` : payload;
  return [
    { kind: "alert", text: "[!] 不正な入力を検知しました", wait: 500 },
    { kind: "log", text: `> payload: ${shown}`, wait: 500 },
    { kind: "log", text: "> 送信元を確認しています ......", wait: 1000 },
    { kind: "log", text: "> セッションを照合しています ......", wait: 1000 },
    { kind: "log", text: "> 犯人を特定しました。", wait: 700 },
    { kind: "aa", text: AA, wait: 2200 },
    { kind: "punch", text: "……なんてね (・∀・)ﾆﾔﾆﾔ", wait: 900 },
    { kind: "small", text: "ここで出す文字は React がぜんぶエスケープするので、<script> は動きません。残念でした。", wait: 900 },
    { kind: "small", text: "その腕、もっといいことに使わない？ このサイトには本物の謎が隠れてる。入口は「存在しないページ」。", wait: 0 },
  ];
}

const STYLE: Record<Step["kind"], string> = {
  alert: "font-mono text-[13px] leading-6 text-[#ff6b6b]",
  log: "font-mono text-[13px] leading-6 text-[#7CFC8A]",
  aa: "aa my-3 overflow-x-auto whitespace-pre text-[#7CFC8A]",
  punch: "mt-2 text-lg font-bold text-white",
  small: "mt-2 text-sm leading-6 text-white/85",
};

export function ScriptPrank({ payload, onClose }: { payload: string; onClose: () => void }) {
  const all = steps(payload);
  const [count, setCount] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? all.length : 1,
  );
  const done = count >= all.length;

  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => setCount((c) => c + 1), all[count - 1].wait);
    return () => clearTimeout(timer);
  }, [count, done, all]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4" role="dialog" aria-modal="true" aria-label="不正な入力の検知">
      <div className="max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-lg bg-[#0b0f0c] p-5 shadow-2xl sm:p-6">
        {all.slice(0, count).map((step, i) =>
          step.kind === "aa" ? (
            <pre key={i} className={STYLE.aa} aria-label="サーバーを落とした犯人はおまえだ！">
              {step.text}
            </pre>
          ) : (
            <p key={i} className={`whitespace-pre-wrap break-all ${STYLE[step.kind]}`}>
              {step.text}
            </p>
          ),
        )}
        {!done && <span className="inline-block h-4 w-2 animate-pulse bg-[#7CFC8A] align-middle" aria-hidden />}
        {done && (
          <div className="mt-5 text-right">
            <button type="button" onClick={onClose} className="btn btn-primary" autoFocus>
              ぐぬぬ……閉じる
            </button>
          </div>
        )}
      </div>
      <style>{`
        /* AA は MS Pゴシック系で幅がそろう。スマホでは小さくして、はみ出したら横にスクロール */
        .aa {
          font-family: "MS PGothic", "ＭＳ Ｐゴシック", "IPAMonaPGothic", "Mona", "Saitamaar", "Osaka", sans-serif;
          font-size: clamp(8px, 1.9vw, 14px);
          line-height: 1.15;
        }
      `}</style>
    </div>
  );
}
