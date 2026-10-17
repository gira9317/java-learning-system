import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getUsers } from "@/api/admin-api";
import { AdminHeader, Panel, PanelSkeleton, Table, Td } from "@/components/admin/admin-ui";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { formatDateTime } from "@/lib/format";
import { getCookieHeader, requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "受講者 — Java Training 管理",
};

export default function AdminUsersPage() {
  return (
    <>
      <AdminHeader eyebrow="研修担当者" title="受講者" />
      <div className="mt-8 space-y-6">
        <Panel title="アカウントの発行">
          <CreateUserForm />
        </Panel>
        <Suspense fallback={<PanelSkeleton height="h-96" />}>
          <UserList />
        </Suspense>
      </div>
    </>
  );
}

async function UserList() {
  await requireAdmin();
  const users = await getUsers({ cookie: await getCookieHeader() });

  return (
    <Panel title={`一覧（${users.length} 人）`}>
      <Table head={["社員番号", "氏名", "進み具合", "今のレッスン", "レビュー待ち", "最後の学習", ""]}>
        {users.map((u) => (
          <tr key={u.id}>
            <Td className="font-mono">{u.employee_no}</Td>
            <Td>
              {u.name}
              {u.role === "admin" && <span className="ml-2 rounded-full bg-chip px-2 py-0.5 type-fine">研修担当者</span>}
              {u.must_change_password && <span className="ml-2 type-fine text-ink-muted-48">初回未サインイン</span>}
            </Td>
            <Td className="whitespace-nowrap">
              {u.role === "admin" ? (
                "—"
              ) : (
                <>
                  {u.completed_count}
                  <span className="text-ink-muted-48"> / {u.lesson_count}</span>
                </>
              )}
            </Td>
            <Td>{u.current_lesson ?? "—"}</Td>
            <Td>{u.pending_count > 0 ? <span className="font-semibold text-primary">{u.pending_count} 件</span> : "—"}</Td>
            <Td className="whitespace-nowrap text-ink-muted-80">{formatDateTime(u.last_activity_at)}</Td>
            <Td className="text-right">
              <Link href={`/admin/users/${u.id}`} className="text-link">
                詳細
              </Link>
            </Td>
          </tr>
        ))}
      </Table>
    </Panel>
  );
}
