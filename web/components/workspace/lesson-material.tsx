import type { ReactNode } from "react";
import type { Lesson } from "@/lib/lessons";
import { pad } from "@/lib/lessons";

// 将来は react-markdown で Markdown 教材を描画する。ここではその見た目（prose スタイル）を定義する。
export function LessonMaterial({ lesson }: { lesson: Lesson }) {
  return (
    <article className="mx-auto max-w-[620px] px-6 py-8">
      <p className="type-caption-strong text-ink-muted-48">Lesson {pad(lesson.id)}</p>
      <h1 className="type-display-md mt-1">{lesson.title}</h1>
      <p className="type-body mt-3 text-ink-muted-80">{lesson.summary}</p>

      {lesson.id === 3 ? <IfStatementMaterial /> : <PlaceholderMaterial />}
    </article>
  );
}

function IfStatementMaterial() {
  return (
    <>
      <H2>if 文の基本形</H2>
      <P>
        プログラムは上から順に実行されますが、<Strong>条件によって実行する処理を変えたい</Strong>
        場面がよくあります。Java では <Code>if</Code> 文を使って処理を分岐させます。
      </P>
      <Pre>{`if (条件式) {
    // 条件式が true のときに実行
} else {
    // 条件式が false のときに実行
}`}</Pre>
      <P>
        条件式には <Code>score &gt;= 60</Code> のように、結果が <Code>true</Code> か{" "}
        <Code>false</Code> になる式を書きます。
      </P>

      <H2>比較演算子</H2>
      <div className="mt-4 overflow-hidden rounded-lg border border-hairline">
        <table className="w-full type-caption">
          <thead className="bg-parchment text-left">
            <tr>
              <th className="px-4 py-2 font-semibold">演算子</th>
              <th className="px-4 py-2 font-semibold">意味</th>
              <th className="px-4 py-2 font-semibold">例</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {[
              ["==", "等しい", "a == b"],
              ["!=", "等しくない", "a != b"],
              [">=", "以上", "score >= 60"],
              ["<", "より小さい", "score < 60"],
            ].map(([op, meaning, ex]) => (
              <tr key={op}>
                <td className="px-4 py-2 font-mono">{op}</td>
                <td className="px-4 py-2">{meaning}</td>
                <td className="px-4 py-2 font-mono text-ink-muted-80">{ex}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Callout title="フローチャートでは">
        条件分岐はひし形のノードで表します。ひし形から出る 2 本の矢印に、それぞれ True / False
        のラベルをつけましょう。
      </Callout>

      <H2>演習</H2>
      <P>
        コマンドライン引数で受け取った点数 <Code>score</Code> が 60 点以上なら「合格」、 60
        点未満なら「不合格」と表示するプログラムを作成してください。
      </P>
      <ol className="mt-4 space-y-3">
        {[
          "フロー図ペインで、処理の流れを設計する",
          "Javaコードペインで、プログラムを完成させて実行する",
          "それぞれ「採点する」を押して結果を確認する",
        ].map((text, i) => (
          <li key={text} className="flex gap-3 type-body">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-parchment type-caption-strong">
              {i + 1}
            </span>
            {text}
          </li>
        ))}
      </ol>

      <h3 className="type-caption-strong mt-8 text-ink-muted-80">採点で使うテストケース</h3>
      <ul className="mt-3 divide-y divide-hairline rounded-lg border border-hairline type-caption">
        {[
          ["80", "合格"],
          ["60", "合格（境界値）"],
          ["59", "不合格"],
        ].map(([input, expected]) => (
          <li key={input} className="flex justify-between px-4 py-2.5">
            <span className="text-ink-muted-80">
              入力 <span className="font-mono text-ink">{input}</span>
            </span>
            <span>
              期待する出力 <span className="font-semibold">{expected}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="h-8" />
    </>
  );
}

function PlaceholderMaterial() {
  return (
    <div className="mt-10 rounded-lg bg-parchment p-6 type-caption text-ink-muted-80">
      このレッスンの教材は準備中です。紙の研修資料を Markdown 化したものがここに表示されます。
    </div>
  );
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="type-tagline mt-10">{children}</h2>;
}
function P({ children }: { children: ReactNode }) {
  return <p className="type-body mt-3">{children}</p>;
}
function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold">{children}</strong>;
}
function Code({ children }: { children: ReactNode }) {
  return <code className="rounded-xs bg-parchment px-1.5 py-0.5 font-mono text-[0.88em]">{children}</code>;
}
function Pre({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-sm bg-tile-3 px-5 py-4 font-mono text-[13px] leading-[1.7] text-white/90">
      {children}
    </pre>
  );
}
function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="mt-8 rounded-lg bg-parchment px-5 py-4">
      <p className="type-caption-strong">{title}</p>
      <p className="type-caption mt-1 text-ink-muted-80">{children}</p>
    </aside>
  );
}
