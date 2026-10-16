"use client";

import { Fragment, useRef, type KeyboardEvent, type ReactNode } from "react";

/*
 * Monaco Editor を導入するまでの軽量エディタ。
 * 透明な textarea をハイライト済みの <pre> に重ねて、入力とシンタックスハイライトを両立する。
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

export function JavaEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lineCount = value.split("\n").length;

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: s, selectionEnd: end } = el;
    onChange(value.slice(0, s) + "    " + value.slice(end));
    requestAnimationFrame(() => {
      ref.current?.setSelectionRange(s + 4, s + 4);
    });
  }

  const textStyle = "font-mono text-[13.5px] leading-[1.75] tracking-normal whitespace-pre";

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-tile-3">
      <div className="flex min-h-full w-max min-w-full">
        <div
          className={`sticky left-0 z-10 shrink-0 select-none bg-tile-3 py-4 pr-4 pl-4 text-right text-white/25 ${textStyle}`}
          aria-hidden
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <div className="relative flex-1">
          <pre className={`py-4 pr-8 text-white/90 ${textStyle}`} aria-hidden>
            {highlight(value)}
            {"\n"}
          </pre>
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            wrap="off"
            aria-label="Javaコード"
            className={`absolute inset-0 resize-none overflow-hidden bg-transparent py-4 pr-8 text-transparent caret-white outline-none selection:bg-primary-on-dark/35 ${textStyle}`}
          />
        </div>
      </div>
    </div>
  );
}
