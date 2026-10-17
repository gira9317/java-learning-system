import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getSubmissions } from "@/api/admin-api";
import { AdminHeader, Panel, PanelSkeleton, Table, Td } from "@/components/admin/admin-ui";
import { kindLabel, SubmissionChip } from "@/components/admin/submission-chip";
import { formatDateTime } from "@/lib/format";
import { pad } from "@/lib/lessons";
import { getCookieHeader, requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "レビュー — Java Training 管理",
};

// 管理画面のトップ。レビュー待ちの提出を古い順に並べる
export default function AdminPage() {
  return (
    <>
      <AdminHeader eyebrow="研修担当者" title="レビュー" />
      <Suspense
        fallback={
          <div className="mt-8 space-y-6">
            <PanelSkeleton />
            <PanelSkeleton />
          </div>
        }
      >
        <ReviewLists />
      </Suspense>
    </>
  );
}

async function ReviewLists() {
  await requireAdmin();
  const cookie = await getCookieHeader();
  const [pending, all] = await Promise.all([getSubmissions("pending", { cookie }), getSubmissions(undefined, { cookie })]);
  const recent = all.filter((s) => s.status !== "pending").slice(0, 10);

  return (
    <div className="mt-8 space-y-6">
      <Panel title={`レビュー待ち（${pending.length} 件）`}>
        {pending.length === 0 ? (
          <p className="type-body text-ink-muted-80">レビュー待ちの提出はありません。</p>
        ) : (
          <Table head={["提出日時", "受講者", "レッスン", "種類", ""]}>
            {pending.map((s) => (
              <tr key={s.id}>
                <Td className="whitespace-nowrap text-ink-muted-80">{formatDateTime(s.created_at)}</Td>
                <Td>
                  <Link href={`/admin/users/${s.user_id}`} className="hover:underline">
                    {s.name}
                  </Link>
                  <span className="ml-2 text-ink-muted-48">{s.employee_no}</span>
                </Td>
                <Td>
                  <span className="text-ink-muted-48">Lesson {pad(s.lesson_id)} </span>
                  {s.lesson_title}
                </Td>
                <Td>{kindLabel[s.kind]}</Td>
                <Td className="text-right">
                  <Link href={`/admin/submissions/${s.id}`} className="btn btn-primary">
                    レビューする
                  </Link>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Panel title="最近のレビュー">
        {recent.length === 0 ? (
          <p className="type-body text-ink-muted-80">まだレビューした提出はありません。</p>
        ) : (
          <Table head={["レビュー日時", "受講者", "レッスン", "種類", "結果"]}>
            {recent.map((s) => (
              <tr key={s.id}>
                <Td className="whitespace-nowrap text-ink-muted-80">
                  <Link href={`/admin/submissions/${s.id}`} className="hover:underline">
                    {formatDateTime(s.reviewed_at)}
                  </Link>
                </Td>
                <Td>
                  {s.name}
                  <span className="ml-2 text-ink-muted-48">{s.employee_no}</span>
                </Td>
                <Td>
                  <span className="text-ink-muted-48">Lesson {pad(s.lesson_id)} </span>
                  {s.lesson_title}
                </Td>
                <Td>{kindLabel[s.kind]}</Td>
                <Td>
                  <SubmissionChip status={s.status} />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
