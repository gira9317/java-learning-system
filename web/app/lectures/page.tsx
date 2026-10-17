import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getLectureChapters, type LectureChapter, type LectureListItem } from "@/api/lectures-api";
import { GlobalNav } from "@/components/global-nav";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { getCookieHeader, requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "講義 — Java Training",
};

// 講義の目次。紙の教材の章立てに合わせて並べ、どこからでも見られる
export default function LecturesPage() {
  return (
    <>
      <GlobalNav variant="app" />
      <main className="flex-1 bg-parchment">
        <div className="mx-auto max-w-[1080px] px-4 pt-8 pb-16 sm:px-6 sm:pt-12 lg:pt-16">
          <header>
            <p className="type-caption-strong text-ink-muted-48">解説動画と資料</p>
            <h1 className="type-display-lg mt-1">講義</h1>
            <p className="type-body mt-3 max-w-[52ch] text-ink-muted-80">
              研修資料の章立てに沿った講義です。順番は自由なので、必要なところから見てください。
            </p>
          </header>
          <Suspense fallback={<div className="mt-10 h-96 animate-pulse rounded-lg border border-hairline bg-canvas" />}>
            <Chapters />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

async function Chapters() {
  await requireUser();
  const chapters = await getLectureChapters({ cookie: await getCookieHeader() });

  return (
    <div className="mt-10 space-y-8">
      {chapters.map((chapter) => (
        <Chapter key={chapter.id} chapter={chapter} />
      ))}
    </div>
  );
}

function Chapter({ chapter }: { chapter: LectureChapter }) {
  const done = chapter.lectures.filter((l) => l.completed).length;
  // 同じ節が続く項目をまとめる（節のない項目は見出しなし）
  const groups: { section: string | null; lectures: LectureListItem[] }[] = [];
  for (const lecture of chapter.lectures) {
    const last = groups.at(-1);
    if (last && last.section === lecture.section) last.lectures.push(lecture);
    else groups.push({ section: lecture.section, lectures: [lecture] });
  }

  return (
    <section className="rounded-lg border border-hairline bg-canvas" aria-labelledby={`chapter-${chapter.id}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-hairline px-5 py-4 sm:px-6">
        <h2 id={`chapter-${chapter.id}`} className="type-tagline">
          <span className="text-ink-muted-48">第{chapter.id}章 </span>
          {chapter.title}
        </h2>
        <p className="type-caption text-ink-muted-48">
          {chapter.page_start && chapter.page_end && <>資料 p.{chapter.page_start}〜{chapter.page_end} ・ </>}
          {done} / {chapter.lectures.length} 済み
        </p>
      </header>

      <div className="px-5 py-2 sm:px-6">
        {groups.map((group, i) => (
          <div key={i} className="py-2">
            {group.section && <h3 className="type-caption-strong pt-2 pb-1 text-ink-muted-80">{group.section}</h3>}
            <ul className="divide-y divide-hairline">
              {group.lectures.map((lecture) => (
                <li key={lecture.id}>
                  <Link
                    href={`/lectures/${lecture.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-pearl focus-visible:outline-2 focus-visible:outline-primary-focus"
                  >
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full ${
                        lecture.completed ? "bg-ink text-white" : "border border-hairline"
                      }`}
                      aria-label={lecture.completed ? "視聴・読了済み" : "未視聴"}
                    >
                      {lecture.completed && <CheckIcon size={12} strokeWidth={3} />}
                    </span>
                    <span className="type-body min-w-0 flex-1">{lecture.title}</span>
                    {!lecture.has_video && !lecture.has_material && (
                      <span className="shrink-0 type-fine text-ink-muted-48">準備中</span>
                    )}
                    <ChevronRightIcon size={16} className="shrink-0 text-ink-muted-48" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
