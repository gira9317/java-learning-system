"use client";

import { useId, useState } from "react";
import type { LectureCheckQuestion } from "@/lib/lecture-material";
import { Markdown } from "./markdown";

export function LectureQuiz({ questions }: { questions: LectureCheckQuestion[] }) {
  const prefix = useId();
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const answered = questions.filter((q) => checked[q.number]);
  const correct = answered.filter((q) => selected[q.number] === q.correctIndex).length;
  return (
    <section className="mt-12 border-t border-hairline pt-8" aria-labelledby={`${prefix}-heading`}>
      <p className="type-fine text-ink-muted-48">小テスト · 4択 × {questions.length}問</p>
      <h2 id={`${prefix}-heading`} className="type-tagline mt-1">確認しよう</h2>
      <p className="type-caption mt-3 text-ink-muted-80">当てはまる答えを1つ選びましょう。間違えても大丈夫。解説を読んで、何度でも選び直せます。</p>
      <ol className="mt-6 space-y-5">
        {questions.map((q) => {
          const revealed = Boolean(checked[q.number]);
          const ok = selected[q.number] === q.correctIndex;
          return (
            <li key={q.number} className="rounded-lg border border-hairline p-4 sm:p-5">
              <fieldset aria-describedby={`${prefix}-${q.number}-prompt`}>
                <legend className="type-caption-strong">問{q.number} <span className="ml-1 type-fine text-ink-muted-48">{q.applied ? "ちょっと応用" : "基本の確認"}</span></legend>
                <div id={`${prefix}-${q.number}-prompt`} className="mt-2"><Markdown>{q.prompt}</Markdown></div>
                <div className="mt-4 space-y-2" aria-describedby={`${prefix}-${q.number}-prompt`}>
                  {q.choices.map((choice, index) => (
                    <label key={index} className={`flex cursor-pointer items-start gap-3 rounded-sm border p-3 type-caption ${selected[q.number] === index ? "border-primary-focus bg-parchment" : "border-hairline"}`}>
                      <input type="radio" name={`${prefix}-${q.number}`} value={index} checked={selected[q.number] === index}
                        onChange={() => { setSelected((s) => ({ ...s, [q.number]: index })); setChecked((s) => ({ ...s, [q.number]: false })); }}
                        className="mt-0.5 shrink-0 accent-primary" />
                      <span><span className="mr-2 font-semibold">{"ABCD"[index]}.</span>{choice}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button type="button" aria-label={`問${q.number}の答え合わせ`} className="btn btn-pearl mt-4 disabled:cursor-not-allowed disabled:opacity-50" disabled={selected[q.number] === undefined}
                onClick={() => setChecked((s) => ({ ...s, [q.number]: true }))}>答え合わせ</button>
              <div aria-live="polite">
                {revealed && (
                  <div className="mt-4 rounded-sm bg-parchment p-4">
                    <p className="type-body-strong">{ok ? "正解！" : "もう一度、ここを確認しよう"}</p>
                    <p className="type-caption mt-2">正解は {"ABCD"[q.correctIndex]}. {q.choices[q.correctIndex]}</p>
                    <div className="mt-2"><Markdown>{q.explanation}</Markdown></div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p role="status" className="type-caption mt-5 text-ink-muted-80">{answered.length === 0 ? "自分のペースで1問ずつ進めましょう。" : `${answered.length}問確認しました · ${correct}問正解`}</p>
      {answered.length > 0 && <button type="button" className="btn btn-pearl mt-3" onClick={() => { setSelected({}); setChecked({}); }}>最初からやり直す</button>}
    </section>
  );
}
