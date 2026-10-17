import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAdminLecture } from "@/api/admin-api";
import { ApiError } from "@/api/client";
import { AdminHeader, PanelSkeleton } from "@/components/admin/admin-ui";
import { LectureEditForm } from "@/components/admin/lecture-edit-form";
import { getCookieHeader, requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "講義の編集 — Java Training 管理",
};

export default function AdminLecturePage({ params }: PageProps<"/admin/lectures/[id]">) {
  return (
    <>
      <p className="type-caption">
        <Link href="/admin/lectures" className="text-link">
          ‹ 講義の一覧
        </Link>
      </p>
      <Suspense fallback={<div className="mt-4"><PanelSkeleton height="h-[640px]" /></div>}>
        <LectureEditor params={params} />
      </Suspense>
    </>
  );
}

async function LectureEditor({ params }: Pick<PageProps<"/admin/lectures/[id]">, "params">) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const lecture = await getAdminLecture(id, { cookie: await getCookieHeader() }).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });

  return (
    <>
      <div className="mt-4">
        <AdminHeader
          eyebrow={`第${lecture.chapter_id}章 ${lecture.chapter_title}${lecture.section ? ` › ${lecture.section}` : ""}`}
          title={lecture.title}
        >
          <Link href={`/lectures/${lecture.id}`} className="btn btn-pearl" target="_blank">
            受講者の画面で見る
          </Link>
        </AdminHeader>
        {lecture.page_start && lecture.page_end && (
          <p className="type-caption mt-2 text-ink-muted-48">
            研修資料 第{lecture.chapter_id}章 p.{lecture.page_start}〜{lecture.page_end}
          </p>
        )}
      </div>
      <div className="mt-8">
        <LectureEditForm lecture={lecture} />
      </div>
    </>
  );
}
