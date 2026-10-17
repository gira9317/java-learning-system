import { Markdown } from "@/components/lecture/markdown";
import type { Lesson } from "@/lib/lessons";
import { pad } from "@/lib/lessons";

// APIから取得したMarkdown教材を、講義と共通のスタイルで表示する。
export function LessonMaterial({ lesson, materialMd }: { lesson: Lesson; materialMd: string | null }) {
  return (
    <article className="mx-auto max-w-[620px] px-6 py-8">
      <p className="type-caption-strong text-ink-muted-48">Lesson {pad(lesson.number)}</p>
      <h1 className="type-display-md mt-1">{lesson.title}</h1>
      <p className="type-body mt-3 text-ink-muted-80">{lesson.summary}</p>

      {materialMd ? (
        <div className="mt-8"><Markdown>{materialMd}</Markdown></div>
      ) : <PlaceholderMaterial />}
    </article>
  );
}

function PlaceholderMaterial() {
  return (
    <div className="mt-10 rounded-lg bg-parchment p-6 type-caption text-ink-muted-80">
      このレッスンの教材は準備中です。
    </div>
  );
}
