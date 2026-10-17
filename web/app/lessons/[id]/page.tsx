import Link from "next/link";
import { Suspense } from "react";
import { GlobalNav } from "@/components/global-nav";
import { ChevronRightIcon } from "@/components/icons";
import { LessonHeader } from "@/components/workspace/lesson-header";
import { LessonMaterial } from "@/components/workspace/lesson-material";
import { LockedLesson } from "@/components/workspace/locked-lesson";
import { StageStep } from "@/components/workspace/stage-step";
import { lessonTitle, loadLesson } from "@/lib/lesson-page";

export async function generateMetadata({ params }: PageProps<"/lessons/[id]">) {
  return { title: await lessonTitle((await params).id, "教材") };
}

// コード演習の「教材」ページ。教材を読んでから「演習」ページへ進む
export default function LessonMaterialPage({ params }: PageProps<"/lessons/[id]">) {
  return (
    <>
      <GlobalNav />
      <Suspense fallback={<div className="h-[calc(100dvh-44px)] bg-parchment" />}>
        <MaterialContent params={params} />
      </Suspense>
    </>
  );
}

async function MaterialContent({ params }: Pick<PageProps<"/lessons/[id]">, "params">) {
  const { lesson, lessons, current, submissions, materialMd } = await loadLesson((await params).id);
  if (!submissions) return <LockedLesson lesson={lesson} current={current} />;

  return (
    <div className="flex h-[calc(100dvh-44px)] min-h-0 flex-none flex-col">
      <LessonHeader lesson={lesson} lessons={lessons} active="material" />

      <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
        <LessonMaterial lesson={lesson} materialMd={materialMd} />
      </div>

      <div className="frosted z-20 flex shrink-0 items-center justify-between gap-4 border-t border-black/[0.08] px-4 py-2.5 sm:min-h-16 sm:px-8 sm:py-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6" aria-label="提出の状況">
          <span className="hidden type-caption-strong text-ink-muted-80 sm:inline">演習の状況</span>
          {lesson.level === "core" && <StageStep label="フロー図" status={submissions.flow.status} />}
          <StageStep label="コード" status={submissions.code.status} />
        </div>
        <Link href={`/lessons/${lesson.id}/exercise`} className="btn btn-primary btn-primary-lg">
          演習に進む
          <ChevronRightIcon size={16} />
        </Link>
      </div>
    </div>
  );
}
