import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getUser } from "@/api/admin-api";
import { ApiError } from "@/api/client";
import { AdminHeader, Panel, PanelSkeleton, Table, Td } from "@/components/admin/admin-ui";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { kindLabel, SubmissionChip } from "@/components/admin/submission-chip";
import { StatusChip } from "@/components/status-chip";
import { formatDateTime } from "@/lib/format";
import { pad } from "@/lib/lessons";
import { getCookieHeader, requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "受講者の詳細 — Java Training 管理",
};

export default function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  return (
    <>
      <p className="type-caption">
        <Link href="/admin/users" className="text-link">
          ‹ 受講者の一覧
        </Link>
      </p>
      <Suspense fallback={<PanelSkeleton height="h-[480px]" />}>
        <UserDetail params={params} />
      </Suspense>
    </>
  );
}

async function UserDetail({ params }: Pick<PageProps<"/admin/users/[id]">, "params">) {
  await requireAdmin();
  const { id } = await params;
  const detail = await getUser(id, { cookie: await getCookieHeader() }).catch((e) => {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) notFound();
    throw e;
  });
  const { user, lessons, submissions } = detail;

  return (
    <>
      <div className="mt-4">
        <AdminHeader eyebrow={user.employee_no} title={user.name}>
          <ResetPasswordButton userId={user.id} name={user.name} />
        </AdminHeader>
        {user.must_change_password && (
          <p className="type-caption mt-2 text-ink-muted-48">初期パスワードのままです（まだ一度もサインインしていないか、変更していません）。</p>
        )}
      </div>

      <div className="mt-8 space-y-6">
        {user.role === "user" && (
          <Panel title="レッスンごとの状態">
            <Table head={["レッスン", "状態", "フロー図", "コード"]}>
              {lessons.map((l) => (
                <tr key={l.id}>
                  <Td>
                    <span className="text-ink-muted-48">Lesson {pad(l.id)} </span>
                    {l.title}
                  </Td>
                  <Td>
                    <StatusChip status={l.status} />
                  </Td>
                  <Td>
                    <SubmissionChip status={l.flow_status} />
                  </Td>
                  <Td>
                    <SubmissionChip status={l.code_status} />
                  </Td>
                </tr>
              ))}
            </Table>
          </Panel>
        )}

        <Panel title={`提出の履歴（${submissions.length} 件）`}>
          {submissions.length === 0 ? (
            <p className="type-body text-ink-muted-80">まだ提出はありません。</p>
          ) : (
            <Table head={["提出日時", "レッスン", "種類", "結果", "コメント", ""]}>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <Td className="whitespace-nowrap text-ink-muted-80">{formatDateTime(s.created_at)}</Td>
                  <Td>
                    <span className="text-ink-muted-48">Lesson {pad(s.lesson_id)} </span>
                    {s.lesson_title}
                  </Td>
                  <Td>{kindLabel[s.kind]}</Td>
                  <Td>
                    <SubmissionChip status={s.status} />
                  </Td>
                  <Td className="max-w-[28ch] truncate text-ink-muted-80">{s.review_comment ?? "—"}</Td>
                  <Td className="text-right">
                    <Link href={`/admin/submissions/${s.id}`} className={s.status === "pending" ? "btn btn-primary" : "text-link"}>
                      {s.status === "pending" ? "レビューする" : "見る"}
                    </Link>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
