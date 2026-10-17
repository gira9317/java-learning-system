import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GlobalNav } from "@/components/global-nav";
import { CheckIcon, ChevronRightIcon, CodeIcon, FlowIcon, LockIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { StatusChip } from "@/components/status-chip";
import { getLessons } from "@/api/lessons-api";
import { getLessonSubmissions, type LessonSubmissions, type StageStatus } from "@/api/submissions-api";
import { getCookieHeader, requireLearner } from "@/lib/session";
import { pad, type Lesson } from "@/lib/lessons";

export const metadata: Metadata = {
  title: "ホーム — Java Training",
};

// 受講者のホーム。「続きから」→ 進み具合 → コード演習の順で、スマホで縦に読み下せる構成。
export default function HomePage() {
  return (
    <>
      <GlobalNav variant="app" />
      <main className="flex-1 bg-parchment">
        <div className="mx-auto max-w-[1080px] px-4 pt-8 pb-16 sm:px-6 sm:pt-12 lg:pt-16">
          <header>
            <p className="type-caption-strong text-ink-muted-48">2026年度 新人研修</p>
            <h1 className="type-display-lg mt-1">おかえりなさい。</h1>
          </header>

          {/* 進捗はユーザーごとに変わるため、リクエスト時に DB から読む */}
          <Suspense fallback={<HomeSkeleton />}>
            <HomeContent />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:gap-5" aria-busy>
      <div className="h-80 animate-pulse rounded-lg bg-tile-1/90" />
      <div className="h-80 animate-pulse rounded-lg border border-hairline bg-canvas" />
    </div>
  );
}

async function HomeContent() {
  await requireLearner();
  const cookie = await getCookieHeader();
  const lessons = await getLessons({ cookie });
  const completed = lessons.filter((l) => l.status === "completed");
  const current = lessons.find((l) => l.status === "in-progress");
  const nextLocked = lessons.find((l) => l.status === "locked");
  const studiedMinutes = completed.reduce((sum, l) => sum + l.minutes, 0);
  const total = lessons.length;
  const currentSubmissions = current ? await getLessonSubmissions(current.id, { cookie }) : null;

  return (
    <>
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:gap-5">
        {current && currentSubmissions && <ContinueCard lesson={current} submissions={currentSubmissions} />}

        {/* 進み具合 */}
        <section className="rounded-lg border border-hairline bg-canvas p-6" aria-labelledby="progress-heading">
          <h2 id="progress-heading" className="type-caption-strong text-ink-muted-80">
            学習の進み具合
          </h2>
          <p className="mt-3 flex items-baseline gap-1">
            <span className="type-display-lg">{completed.length}</span>
            <span className="type-body text-ink-muted-48">/ {total} レッスン完了</span>
          </p>
          <div className="mt-4 flex gap-1" aria-hidden>
            {lessons.map((l) => (
              <span
                key={l.id}
                className={`h-1.5 flex-1 rounded-full ${
                  l.status === "completed" ? "bg-ink" : l.status === "in-progress" ? "bg-primary" : "bg-chip"
                }`}
              />
            ))}
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-hairline pt-5">
            <div>
              <dt className="type-fine text-ink-muted-48">学習時間（目安）</dt>
              <dd className="type-body-strong mt-1">
                {Math.floor(studiedMinutes / 60)}時間{studiedMinutes % 60}分
              </dd>
            </div>
            <div>
              <dt className="type-fine text-ink-muted-48">次に解放</dt>
              <dd className="type-body-strong mt-1">
                {nextLocked ? `Lesson ${pad(nextLocked.id)}` : "—"}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* コード演習 */}
      <section id="curriculum" className="mt-14 scroll-mt-14 sm:mt-16" aria-labelledby="curriculum-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="curriculum-heading" className="type-display-md">
            コード演習
          </h2>
          <span className="type-caption text-ink-muted-48">全{total}レッスン</span>
        </div>
        <ul className="mt-5 grid gap-3 md:grid-cols-2 md:gap-4">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <LessonRow lesson={lesson} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

const stageText: Record<StageStatus, string> = {
  none: "未提出",
  pending: "レビュー待ち",
  approved: "承認済み",
  rejected: "要再提出",
};

function ContinueCard({ lesson, submissions }: { lesson: Lesson; submissions: LessonSubmissions }) {
  // フロー図 → コードの順に提出し、それぞれ研修担当者の承認を受ける
  const tasks = [
    { icon: FlowIcon, label: "フロー図", status: submissions.flow.status },
    { icon: CodeIcon, label: "Javaコード", status: submissions.code.status },
  ];
  const rejected = [submissions.latest.flow, submissions.latest.code].find((s) => s?.status === "rejected");

  return (
    <section className="on-dark flex flex-col rounded-lg bg-tile-1 p-6 text-white sm:p-8" aria-labelledby="continue-heading">
      <p className="type-caption-strong text-body-muted">続きから — Lesson {pad(lesson.id)}</p>
      <h2 id="continue-heading" className="type-display-md mt-2">
        {lesson.title}
      </h2>
      <p className="type-body mt-2 text-body-muted">{lesson.summary}</p>

      <ul className="mt-6 grid grid-cols-2 gap-2">
        {tasks.map((task) => (
          <li key={task.label} className="rounded-sm bg-white/[0.06] px-3 py-3">
            <div className="flex items-center justify-between text-body-muted">
              <task.icon size={18} />
              {task.status === "approved" && (
                <span className="grid size-[18px] place-items-center rounded-full bg-white text-ink">
                  <CheckIcon size={11} strokeWidth={3} />
                </span>
              )}
            </div>
            <p className={`type-caption mt-3 ${task.status === "approved" ? "text-white" : "text-body-muted"}`}>{task.label}</p>
            <p className={`type-fine mt-0.5 ${task.status === "rejected" ? "text-[#ff6961]" : "text-body-muted"}`}>
              {stageText[task.status]}
            </p>
          </li>
        ))}
      </ul>

      {rejected && (
        <p className="mt-4 rounded-sm bg-white/[0.06] px-4 py-3 type-caption text-white/85">
          <span className="font-semibold">差し戻しコメント：</span>「{rejected.review_comment}」
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:mt-auto sm:flex-row sm:items-center sm:justify-between sm:pt-8">
        <span className="type-caption text-body-muted">約 {lesson.minutes} 分</span>
        <Link href={`/lessons/${lesson.id}`} className="btn btn-primary btn-primary-lg w-full sm:w-auto">
          学習を再開する
        </Link>
      </div>
    </section>
  );
}

function LessonRow({ lesson }: { lesson: Lesson }) {
  const locked = lesson.status === "locked";
  const active = lesson.status === "in-progress";

  const content = (
    <div
      className={`flex min-h-[88px] items-center gap-4 rounded-lg border bg-canvas px-4 py-4 sm:px-5 ${
        active ? "border-2 border-primary-focus px-[15px] py-[15px] sm:px-[19px]" : "border-hairline"
      } ${locked ? "bg-pearl" : ""}`}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-full type-caption-strong ${
          lesson.status === "completed"
            ? "bg-ink text-white"
            : active
              ? "bg-primary text-white"
              : "bg-parchment text-ink-muted-48"
        }`}
      >
        {lesson.status === "completed" ? <CheckIcon size={16} strokeWidth={2.4} /> : locked ? <LockIcon size={15} /> : pad(lesson.id)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="type-fine text-ink-muted-48">Lesson {pad(lesson.id)}</span>
          <span className="hidden sm:inline">
            <StatusChip status={lesson.status} />
          </span>
        </div>
        <p className={`type-body-strong mt-1 truncate ${locked ? "text-ink-muted-48" : ""}`}>{lesson.title}</p>
        <p className={`type-caption mt-0.5 line-clamp-1 ${locked ? "text-ink-muted-48" : "text-ink-muted-80"}`}>
          {lesson.summary}
        </p>
      </div>
      {!locked && <ChevronRightIcon size={18} className="shrink-0 text-ink-muted-48" />}
    </div>
  );

  if (locked) return <div aria-disabled>{content}</div>;
  return (
    <Link
      href={`/lessons/${lesson.id}`}
      className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus"
    >
      {content}
    </Link>
  );
}
