import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getLessons } from "@/api/lessons-api";
import { GlobalNav } from "@/components/global-nav";
import { CheckIcon, ChevronRightIcon, LockIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { StatusChip } from "@/components/status-chip";
import { pad, type Lesson } from "@/lib/lessons";
import { getCookieHeader, requireLearner } from "@/lib/session";

export const metadata: Metadata = { title: "コード演習 — Java Training" };

const stages = [
  { id: "intro", title: "はじめの一歩", description: "まずは動かして、文字や数字を1か所ずつ変えてみましょう。", ids: [11, 12, 13, 14, 15], approach: "コードのみ" },
  { id: "basics", title: "Javaの基本", description: "変数・条件分岐・繰り返し・配列を使って、小さな処理を組み立てます。", ids: [1, 2, 3, 4, 5, 6, 7], approach: "フロー図 → コード" },
  { id: "objects", title: "メソッドとクラス", description: "処理をメソッドに分け、データと振る舞いをクラスにまとめます。", ids: [8, 9], approach: "フロー図 → コード" },
  { id: "practice", title: "読みやすさとエラーへの備え", description: "動くコードを読みやすく整え、エラーへの対処も学びます。", ids: [16, 10], approach: "提出方法はレッスンごとに確認" },
  { id: "advanced", title: "オブジェクト指向で組み立てる", description: "継承・インターフェース・コレクションを使い、package に分けた小さな業務システムを作ります。", ids: [17, 18, 19], approach: "コードのみ（複数ファイル）" },
  { id: "making", title: "自分で作る", description: "正解が1つではない課題やオセロを、設計から考えて作ります。評価は研修担当者のレビューです。", ids: [20, 21], approach: "コードのみ（対話で実行）" },
];

export default function CurriculumPage() {
  return (
    <>
      <GlobalNav variant="app" />
      <main className="flex-1 bg-parchment">
        <div className="mx-auto max-w-[1080px] px-4 pt-8 pb-16 sm:px-6 sm:pt-12 lg:pt-16">
          <header>
            <p className="type-caption-strong text-ink-muted-48">学んだことを、自分で書いて確かめる</p>
            <h1 className="type-display-lg mt-1">コード演習</h1>
            <p className="type-body mt-3 max-w-[56ch] text-ink-muted-80">初めての実行から、読みやすいコードを書くところまで。上から順に、1レッスン5問ずつ取り組みます。</p>
          </header>
          <Suspense fallback={<div className="mt-8 h-80 animate-pulse rounded-lg border border-hairline bg-canvas" aria-label="演習の進捗を読み込み中" aria-busy />}>
            <CurriculumContent />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

async function CurriculumContent() {
  await requireLearner();
  const lessons = await getLessons({ cookie: await getCookieHeader() });
  const completed = lessons.filter((lesson) => lesson.status === "completed").length;
  const current = lessons.find((lesson) => lesson.status === "in-progress");

  return (
    <>
      <section className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-lg border border-hairline bg-canvas p-5 sm:p-6" aria-label="コード演習の進み具合">
        <div>
          <p className="type-body-strong">{completed} / {lessons.length} レッスン完了</p>
          <p className="type-caption mt-1 text-ink-muted-80">全{lessons.length * 5}問 · 各レッスンの5問が承認されると、次が解放されます。</p>
        </div>
        {current ? <Link href={`/lessons/${current.id}`} className="btn btn-primary btn-primary-lg">Lesson {pad(current.number)} を続ける</Link> : lessons.length > 0 && completed === lessons.length ? <p className="type-caption-strong">すべてのレッスンを完了しました。復習したい内容を選べます。</p> : null}
      </section>

      <nav aria-label="学習段階の目次" className="mt-6 flex flex-wrap gap-2">
        {stages.map((stage, index) => <a key={stage.id} href={`#${stage.id}`} className="rounded-full border border-hairline bg-canvas px-4 py-2 type-caption hover:bg-pearl focus-visible:outline-2 focus-visible:outline-primary-focus">{index + 1}. {stage.title}</a>)}
      </nav>

      <div className="mt-8 space-y-8">
        {stages.map((stage, index) => {
          const items = lessons.filter((lesson) => stage.ids.includes(lesson.id));
          const done = items.filter((lesson) => lesson.status === "completed").length;
          return (
            <section key={stage.id} id={stage.id} className="scroll-mt-16 rounded-lg border border-hairline bg-canvas" aria-labelledby={`${stage.id}-heading`}>
              <header className="border-b border-hairline px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 id={`${stage.id}-heading`} className="type-tagline"><span className="mr-3 text-ink-muted-48">STEP {index + 1}</span>{stage.title}</h2>
                  <p className="type-caption text-ink-muted-48">{done} / {items.length} 完了 · 約{items.reduce((sum, lesson) => sum + lesson.minutes, 0)}分</p>
                </div>
                <p className="type-body mt-2 text-ink-muted-80">{stage.description}</p>
                <p className="type-fine mt-2 text-ink-muted-48">{stage.approach}</p>
              </header>
              <ul className="divide-y divide-hairline px-5 sm:px-6">
                {items.map((lesson) => <li key={lesson.id}><LessonItem lesson={lesson} /></li>)}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="type-caption mt-6 text-ink-muted-80">鍵の付いたレッスンは、前のレッスンを完了すると開けます。分からないときは<Link href="/lectures" className="underline underline-offset-4">講義の動画・資料</Link>も確認してみましょう。</p>
    </>
  );
}

function LessonItem({ lesson }: { lesson: Lesson }) {
  const locked = lesson.status === "locked";
  const content = (
    <>
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${lesson.status === "completed" ? "bg-ink text-white" : lesson.status === "in-progress" ? "bg-primary text-white" : "bg-parchment text-ink-muted-48"}`} aria-hidden>
        {lesson.status === "completed" ? <CheckIcon size={16} /> : locked ? <LockIcon size={15} /> : <span className="type-caption-strong">{pad(lesson.number)}</span>}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><span className="type-fine text-ink-muted-48">Lesson {pad(lesson.number)}</span><StatusChip status={lesson.status} /></div>
        <h3 className="type-body-strong mt-1">{lesson.title}</h3>
        <p className="type-caption mt-1 text-ink-muted-80">{lesson.summary}</p>
        <p className="type-fine mt-2 text-ink-muted-48">5問 · 約{lesson.minutes}分 · {lesson.level === "core" ? "フロー図 → コード" : "コードのみ"}</p>
      </div>
      {!locked && <ChevronRightIcon size={18} className="shrink-0 text-ink-muted-48" aria-hidden />}
    </>
  );
  const className = "flex items-center gap-4 rounded-sm py-5";
  return locked ? <div className={className} aria-disabled="true">{content}</div> : <Link href={`/lessons/${lesson.id}`} className={`${className} hover:bg-pearl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus`}>{content}</Link>;
}
