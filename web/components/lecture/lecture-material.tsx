import { splitLectureMaterial } from "@/lib/lecture-material";
import { Markdown } from "./markdown";
import { LectureQuiz } from "./lecture-quiz";

export function LectureMaterial({ children, lectureId }: { children: string; lectureId: number }) {
  const { introduction, body, questions, option } = splitLectureMaterial(children);
  return (
    <>
      {introduction ? (
        <>
          <Markdown>{introduction}</Markdown>
          <details className="mt-8 rounded-lg border border-hairline p-4 sm:p-5">
            <summary className="type-body-strong cursor-pointer focus-visible:outline-2 focus-visible:outline-primary-focus">詳しい説明・コード例（慣れてきたら）</summary>
            <div className="mt-5"><Markdown>{body}</Markdown></div>
          </details>
        </>
      ) : <Markdown>{body}</Markdown>}
      {questions.length > 0 && <LectureQuiz key={lectureId} questions={questions} />}
      {option && (
        <aside className="mt-10 rounded-lg border border-hairline bg-parchment p-5 sm:p-6" aria-label="発展学習のコラム">
          <p className="type-fine text-ink-muted-48">OPTION · もっと学びたい人へ</p>
          <details className="mt-2">
            <summary className="type-body-strong cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus">{option.title}</summary>
            <div className="mt-4"><Markdown>{option.body}</Markdown></div>
          </details>
          <p className="type-fine mt-3 text-ink-muted-48">任意の発展資料です。興味があれば開いて読んでみましょう。</p>
        </aside>
      )}
    </>
  );
}
