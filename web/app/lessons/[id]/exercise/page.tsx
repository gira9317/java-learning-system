import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GlobalNav } from "@/components/global-nav";
import { ExerciseWorkspace } from "@/components/workspace/exercise-workspace";
import { LockedLesson } from "@/components/workspace/locked-lesson";
import { lessonTitle, loadLesson } from "@/lib/lesson-page";

export async function generateMetadata({ params }: PageProps<"/lessons/[id]/exercise">) {
  return { title: await lessonTitle((await params).id, "演習") };
}

// コード演習の「演習」ページ。上に問題文、左にフロー図、右にコード
export default function LessonExercisePage({ params, searchParams }: PageProps<"/lessons/[id]/exercise">) {
  return (
    <>
      <GlobalNav />
      <Suspense fallback={<div className="h-[calc(100dvh-44px)] bg-parchment" />}>
        <ExerciseContent params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ExerciseContent({ params, searchParams }: Pick<PageProps<"/lessons/[id]/exercise">, "params" | "searchParams">) {
  const raw = (await searchParams).question ?? "1";
  if (typeof raw !== "string" || !/^[1-5]$/.test(raw)) notFound();
  const questionNo = Number(raw);
  const { lesson, lessons, current, submissions, exercises } = await loadLesson((await params).id, questionNo);
  if (!submissions) return <LockedLesson lesson={lesson} current={current} />;

  const question = exercises.find((q) => q.number === questionNo);
  if (!question) notFound();
  return <ExerciseWorkspace key={`${lesson.id}:${questionNo}`} lesson={lesson} lessons={lessons} submissions={submissions} question={question} questions={exercises} />;
}
