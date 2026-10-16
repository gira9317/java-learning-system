import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCatalog, getLessons } from "@/api/lessons-api";
import { GlobalNav } from "@/components/global-nav";
import { LockIcon } from "@/components/icons";
import { LearningWorkspace } from "@/components/workspace/learning-workspace";
import { pad, type Lesson } from "@/lib/lessons";
import { getCookieHeader, requireUser } from "@/lib/session";

/** URL の [id] をレッスン ID（正の整数）にする。不正なら null */
function parseLessonId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: PageProps<"/lessons/[id]">) {
  const id = parseLessonId((await params).id);
  const lesson = id ? (await getCatalog()).find((l) => l.id === id) : undefined;
  return { title: lesson ? `Lesson ${pad(lesson.id)} ${lesson.title} — Java Training` : "Java Training" };
}

// 進捗はユーザーごとに変わるため、リクエスト時に API から読む。
export default function LessonPage({ params }: PageProps<"/lessons/[id]">) {
  return (
    <>
      <GlobalNav />
      <Suspense fallback={<div className="h-[calc(100dvh-44px)] bg-parchment" />}>
        <LessonContent params={params} />
      </Suspense>
    </>
  );
}

async function LessonContent({ params }: Pick<PageProps<"/lessons/[id]">, "params">) {
  const id = parseLessonId((await params).id);
  if (!id) notFound();

  await requireUser();
  const lessons = await getLessons({ cookie: await getCookieHeader() });
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) notFound();

  if (lesson.status === "locked") return <LockedLesson lesson={lesson} current={lessons.find((l) => l.status === "in-progress")} />;
  return <LearningWorkspace lesson={lesson} lessons={lessons} />;
}

function LockedLesson({ lesson, current }: { lesson: Lesson; current?: Lesson }) {
  return (
    <main className="grid flex-1 place-items-center bg-parchment px-4 py-20 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-canvas text-ink-muted-48">
          <LockIcon size={24} />
        </span>
        <p className="type-caption-strong mt-6 text-ink-muted-48">Lesson {pad(lesson.id)}</p>
        <h1 className="type-display-lg mt-1">{lesson.title}</h1>
        <p className="type-body mx-auto mt-4 max-w-[36ch] text-ink-muted-80">
          このレッスンは、前のレッスンを完了すると解放されます。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {current && (
            <Link href={`/lessons/${current.id}`} className="btn btn-primary btn-primary-lg">
              Lesson {pad(current.id)} を続ける
            </Link>
          )}
          <Link href="/home#curriculum" className="btn btn-secondary btn-secondary-lg">
            カリキュラムへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
