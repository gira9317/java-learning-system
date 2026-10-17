import { Suspense } from "react";
import { GlobalNav } from "@/components/global-nav";
import { ExerciseWorkspace } from "@/components/workspace/exercise-workspace";
import { LockedLesson } from "@/components/workspace/locked-lesson";
import { lessonTitle, loadLesson } from "@/lib/lesson-page";

export async function generateMetadata({ params }: PageProps<"/lessons/[id]/exercise">) {
  return { title: await lessonTitle((await params).id, "演習") };
}

// コード演習の「演習」ページ。上に問題文、左にフロー図、右にコード
export default function LessonExercisePage({ params }: PageProps<"/lessons/[id]/exercise">) {
  return (
    <>
      <GlobalNav />
      <Suspense fallback={<div className="h-[calc(100dvh-44px)] bg-parchment" />}>
        <ExerciseContent params={params} />
      </Suspense>
    </>
  );
}

async function ExerciseContent({ params }: Pick<PageProps<"/lessons/[id]/exercise">, "params">) {
  const { lesson, lessons, current, submissions } = await loadLesson((await params).id);
  if (!submissions) return <LockedLesson lesson={lesson} current={current} />;

  return <ExerciseWorkspace lesson={lesson} lessons={lessons} submissions={submissions} />;
}
