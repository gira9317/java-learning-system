import type { ExerciseQuestion } from "@/api/lessons-api";
import { Markdown } from "@/components/lecture/markdown";

export function ProblemStatement({ question }: { question: ExerciseQuestion }) {
  return (
    <div>
      <h3 className="type-tagline">{question.title}</h3>
      <div className="mt-3"><Markdown>{question.prompt}</Markdown></div>
      <p className="type-fine mt-4 text-ink-muted-48">
        引数は実行欄に半角スペース区切りで入力します。出力は指定された内容だけを表示してください。
      </p>
      <h4 className="type-caption-strong mt-6">入出力例</h4>
      <ul className="mt-3 space-y-3">
        {question.examples.map((example, index) => (
          <li key={index} className="overflow-hidden rounded-lg border border-hairline type-caption">
            <p className="bg-parchment px-3 py-2">例 {index + 1}{example.label && ` · ${example.label}`}</p>
            <dl className="space-y-2 p-3">
              <div><dt className="text-ink-muted-48">コマンドライン引数</dt><dd className="mt-1 whitespace-pre-wrap break-words font-mono">{example.args.join(" ") || "（なし）"}</dd></div>
              <div><dt className="text-ink-muted-48">期待する出力</dt><dd className="mt-1 whitespace-pre-wrap break-words font-mono">{example.expected || "（出力なし）"}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
      <p className="type-fine mt-4 text-ink-muted-48">採点では、上の例以外の入力も確認する場合があります。クラスやメソッドなどの構成は担当者がレビューします。</p>
    </div>
  );
}
