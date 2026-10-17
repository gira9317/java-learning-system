import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminLectures, type AdminLectureRow } from "@/api/admin-api";
import { AdminHeader, Panel, PanelSkeleton, Table, Td } from "@/components/admin/admin-ui";
import { formatDateTime } from "@/lib/format";
import { getCookieHeader, requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "講義の登録 — Java Training 管理",
};

export default function AdminLecturesPage() {
  return (
    <>
      <AdminHeader eyebrow="研修担当者" title="講義の登録" />
      <p className="type-body mt-3 max-w-[60ch] text-ink-muted-80">
        目次は研修資料の章立てで登録済みです。各項目の解説動画と資料を登録してください。
      </p>
      <Suspense fallback={<div className="mt-8"><PanelSkeleton height="h-[560px]" /></div>}>
        <LectureList />
      </Suspense>
    </>
  );
}

async function LectureList() {
  await requireAdmin();
  const lectures = await getAdminLectures({ cookie: await getCookieHeader() });

  const chapters = new Map<number, { title: string; lectures: AdminLectureRow[] }>();
  for (const l of lectures) {
    const ch = chapters.get(l.chapter_id) ?? { title: l.chapter_title, lectures: [] };
    ch.lectures.push(l);
    chapters.set(l.chapter_id, ch);
  }
  const registered = lectures.filter((l) => l.has_video || l.has_material).length;

  return (
    <div className="mt-8 space-y-6">
      <p className="type-caption text-ink-muted-80">
        登録済み {registered} / {lectures.length} 項目
      </p>
      {[...chapters].map(([id, ch]) => (
        <Panel key={id} title={`第${id}章 ${ch.title}`}>
          <Table head={["節", "項目", "動画", "資料", "読了", "最終更新", ""]}>
            {ch.lectures.map((l) => (
              <tr key={l.id}>
                <Td className="text-ink-muted-48">{l.section ?? "—"}</Td>
                <Td>{l.title}</Td>
                <Td>{l.has_video ? "あり" : <span className="text-ink-muted-48">未登録</span>}</Td>
                <Td>{l.has_material ? "あり" : <span className="text-ink-muted-48">未登録</span>}</Td>
                <Td className="whitespace-nowrap">{l.completed_count} 人</Td>
                <Td className="whitespace-nowrap text-ink-muted-80">{formatDateTime(l.updated_at)}</Td>
                <Td className="text-right">
                  <Link href={`/admin/lectures/${l.id}`} className="text-link">
                    編集
                  </Link>
                </Td>
              </tr>
            ))}
          </Table>
        </Panel>
      ))}
    </div>
  );
}
