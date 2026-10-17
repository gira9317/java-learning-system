"use client";

import { Fragment, type ReactNode } from "react";

/*
 * 管理画面で提出されたコードを表示するための、軽量なシンタックスハイライト。
 * （受講者が書くエディタは monaco-java-editor.tsx の Monaco Editor）
 */

const KEYWORDS = new Set([
  "public", "private", "protected", "class", "static", "void", "if", "else", "for", "while",
  "return", "new", "switch", "case", "break", "default", "final", "try", "catch", "throw",
  "int", "double", "boolean", "char", "long", "true", "false", "null",
]);

const TOKEN = /(\/\/.*$|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*")|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)\b/gm;

function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    const index = m.index ?? 0;
    if (index > last) out.push(code.slice(last, index));
    const [text, comment, str, num, word] = m;
    let cls = "";
    if (comment) cls = "text-[#7f8c98] italic";
    else if (str) cls = "text-[#fc6a5d]";
    else if (num) cls = "text-[#d9c97c]";
    else if (word && KEYWORDS.has(word)) cls = "text-[#ff7ab2] font-semibold";
    else if (word && /^[A-Z]/.test(word)) cls = "text-[#5dd8ff]";
    out.push(cls ? <span key={index} className={cls}>{text}</span> : <Fragment key={index}>{text}</Fragment>);
    last = index + text.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

/** 提出されたコードの読み取り専用の表示（管理画面のレビュー用） */
export function CodeView({ code }: { code: string }) {
  const lines = code.split("\n");
  const textStyle = "font-mono text-[13px] leading-[1.75] tracking-normal whitespace-pre";
  return (
    <div className="overflow-auto rounded-sm bg-tile-3">
      <div className="flex w-max min-w-full">
        <div className={`shrink-0 select-none py-4 pr-4 pl-4 text-right text-white/25 ${textStyle}`} aria-hidden>
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className={`flex-1 py-4 pr-8 text-white/90 ${textStyle}`}>{highlight(code)}</pre>
      </div>
    </div>
  );
}
