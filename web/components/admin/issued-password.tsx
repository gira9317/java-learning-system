"use client";

import { useState } from "react";

/** 発行・再発行した初期パスワードの表示。API はこの値を保存しないので、閉じると二度と見られない */
export function IssuedPassword({ title, password, onClose }: { title: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      // クリップボードが使えない環境では、表示された文字を手で写してもらう
    }
  }

  return (
    <div role="status" className="mt-4 rounded-lg border border-success/40 bg-success/10 px-5 py-4">
      <p className="type-caption-strong">{title}</p>
      <p className="type-caption mt-1 text-ink-muted-80">
        初期パスワードを本人に伝えてください。この画面を閉じると再表示できません。初回サインイン時に変更を求められます。
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <code className="rounded-sm bg-canvas px-4 py-2 font-mono text-[15px] tracking-wider">{password}</code>
        <button type="button" className="btn btn-pearl" onClick={copy}>
          {copied ? "コピーしました" : "コピー"}
        </button>
        <button type="button" className="btn text-link type-caption" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
}
