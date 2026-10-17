import Link from "next/link";
import { LockIcon } from "@/components/icons";
import { pad, type Lesson } from "@/lib/lessons";

/** 未解放のレッスンを開いたときの案内 */
export function LockedLesson({ lesson, current }: { lesson: Lesson; current?: Lesson }) {
  return (
    <main className="grid flex-1 place-items-center bg-parchment px-4 py-20 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-canvas text-ink-muted-48">
          <LockIcon size={24} />
        </span>
        <p className="type-caption-strong mt-6 text-ink-muted-48">Lesson {pad(lesson.number)}</p>
        <h1 className="type-display-lg mt-1">{lesson.title}</h1>
        <p className="type-body mx-auto mt-4 max-w-[36ch] text-ink-muted-80">
          このレッスンは、前のレッスンを完了すると解放されます。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {current && (
            <Link href={`/lessons/${current.id}`} className="btn btn-primary btn-primary-lg">
              Lesson {pad(current.number)} を続ける
            </Link>
          )}
          <Link href="/curriculm" className="btn btn-secondary btn-secondary-lg">
            コード演習の一覧へ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
