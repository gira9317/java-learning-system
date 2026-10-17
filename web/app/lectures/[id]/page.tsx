import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ApiError } from "@/api/client";
import { getLecture } from "@/api/lectures-api";
import { GlobalNav } from "@/components/global-nav";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { CompleteToggle } from "@/components/lecture/complete-toggle";
import { Markdown } from "@/components/lecture/markdown";
import { VideoEmbed, VideoPlaceholder } from "@/components/lecture/video-embed";
import { getCookieHeader, requireUser } from "@/lib/session";

/** URL の [id] を講義 ID（正の整数）にする。不正なら null */
function parseLectureId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: PageProps<"/lectures/[id]">) {
  const id = parseLectureId((await params).id);
  const lecture = id ? await getLecture(id, { cookie: await getCookieHeader() }).catch(() => null) : null;
  return { title: lecture ? `${lecture.title} — 講義 — Java Training` : "講義 — Java Training" };
}

// 講義の 1 項目。左に解説動画、右に資料（スマホでは縦に並べる）
export default function LecturePage({ params }: PageProps<"/lectures/[id]">) {
  return (
    <>
      <GlobalNav variant="app" />
      <Suspense fallback={<div className="min-h-[calc(100dvh-44px)] bg-canvas" />}>
        <LectureContent params={params} />
      </Suspense>
    </>
  );
}

async function LectureContent({ params }: Pick<PageProps<"/lectures/[id]">, "params">) {
  const id = parseLectureId((await params).id);
  if (!id) notFound();

  await requireUser();
  const lecture = await getLecture(id, { cookie: await getCookieHeader() }).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });

  return (
    <main className="flex-1 bg-canvas lg:grid lg:h-[calc(100dvh-44px)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* 左: 解説動画（PC では固定し、資料だけをスクロールする） */}
      <section className="border-hairline bg-parchment px-4 py-6 sm:px-6 lg:overflow-y-auto lg:border-r lg:py-8" aria-label="解説動画">
        <nav className="type-caption text-ink-muted-48" aria-label="現在の位置">
          <Link href="/lectures" className="text-link">
            講義
          </Link>
          <span> › 第{lecture.chapter_id}章 {lecture.chapter_title}</span>
          {lecture.section && <span> › {lecture.section}</span>}
        </nav>
        <h1 className="type-display-md mt-2">{lecture.title}</h1>

        <div className="mt-6">
          {lecture.video_url ? <VideoEmbed url={lecture.video_url} title={lecture.title} /> : <VideoPlaceholder />}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <CompleteToggle lectureId={lecture.id} initial={lecture.completed} />
          <div className="flex items-center gap-2">
            {lecture.prev_id ? (
              <Link href={`/lectures/${lecture.prev_id}`} className="btn btn-icon size-10" aria-label="前の講義">
                <ChevronLeftIcon size={16} />
              </Link>
            ) : null}
            {lecture.next_id ? (
              <Link href={`/lectures/${lecture.next_id}`} className="btn btn-pearl">
                次の講義
                <ChevronRightIcon size={15} />
              </Link>
            ) : (
              <Link href="/lectures" className="btn btn-pearl">
                目次へ
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 右: 資料 */}
      <section className="px-4 py-8 sm:px-6 lg:overflow-y-auto lg:px-10" aria-label="資料">
        <article className="mx-auto max-w-[680px]">
          <p className="type-caption-strong text-ink-muted-48">
            資料
            {lecture.page_start && lecture.page_end && (
              <span className="font-normal">
                {" "}
                ・ 研修資料 第{lecture.chapter_id}章 p.{lecture.page_start}〜{lecture.page_end}
              </span>
            )}
          </p>
          <div className="mt-4">
            {lecture.material_md ? (
              <Markdown>{lecture.material_md}</Markdown>
            ) : (
              <p className="rounded-lg bg-parchment p-6 type-caption text-ink-muted-80">
                この講義の資料は準備中です。研修資料（紙）の該当ページを参照してください。
              </p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
