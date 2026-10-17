import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSubmission } from "@/api/admin-api";
import { ApiError } from "@/api/client";
import type { CodeContent, FlowContent } from "@/api/submissions-api";
import { Panel, PanelSkeleton } from "@/components/admin/admin-ui";
import { ReviewForm } from "@/components/admin/review-form";
import { kindLabel, SubmissionChip } from "@/components/admin/submission-chip";
import { CheckIcon, XIcon } from "@/components/icons";
import { FlowPreview } from "@/components/workspace/flow-preview";
import { CodeView } from "@/components/workspace/java-editor";
import { ProblemStatement } from "@/components/workspace/problem-statement";
import { formatDateTime } from "@/lib/format";
import { pad } from "@/lib/lessons";
import { getCookieHeader, requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "提出のレビュー — Java Training 管理",
};

export default function AdminSubmissionPage({ params }: PageProps<"/admin/submissions/[id]">) {
  return (
    <>
      <p className="type-caption">
        <Link href="/admin" className="text-link">
          ‹ レビュー待ちの一覧
        </Link>
      </p>
      <Suspense fallback={<PanelSkeleton height="h-[560px]" />}>
        <SubmissionDetail params={params} />
      </Suspense>
    </>
  );
}

async function SubmissionDetail({ params }: Pick<PageProps<"/admin/submissions/[id]">, "params">) {
  await requireAdmin();
  const { id } = await params;
  const s = await getSubmission(id, { cookie: await getCookieHeader() }).catch((e) => {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) notFound();
    throw e;
  });

  return (
    <>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-caption-strong text-ink-muted-48">
            Lesson {pad(s.lesson_number)} · 第{s.question_no}問 · {s.lesson_title}
          </p>
          <h1 className="type-display-lg mt-1">
            {kindLabel[s.kind]}の提出
          </h1>
          <p className="type-body mt-2 text-ink-muted-80">
            <Link href={`/admin/users/${s.user_id}`} className="hover:underline">
              {s.name}
            </Link>
            <span className="ml-2 text-ink-muted-48">{s.employee_no}</span>
            <span className="ml-4 text-ink-muted-48">提出 {formatDateTime(s.created_at)}</span>
          </p>
        </div>
        <SubmissionChip status={s.status} />
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel title={kindLabel[s.kind]}>
          {s.kind === "flow" ? (
            <div className="rounded-sm bg-parchment [background-image:radial-gradient(#d2d2d7_1px,transparent_1px)] [background-size:20px_20px]">
              <FlowPreview content={s.content as FlowContent} />
            </div>
          ) : (
            <CodeView code={(s.content as CodeContent).code} />
          )}
        </Panel>

        <div className="space-y-6">
          {s.question && <Panel title="問題文"><ProblemStatement question={s.question} /></Panel>}
          <Panel title="自動採点（参考）">
            <AutoResults kind={s.kind} results={s.auto_results} />
            <p className="type-fine mt-3 text-ink-muted-48">
              {s.kind === "code"
                ? "提出時にサーバーで実際に実行して採点した結果です（【非公開】は受講者に入力と期待する出力を見せていないテストケース）。"
                : "受講者のブラウザで採点した結果です。判定は中身を見て行ってください。"}
            </p>
          </Panel>

          <Panel title="レビュー">
            {s.status === "pending" ? (
              <ReviewForm submissionId={s.id} kind={s.kind} />
            ) : (
              <div className="space-y-2">
                <SubmissionChip status={s.status} />
                <p className="type-caption text-ink-muted-80">
                  {s.reviewer_name ?? "（削除されたユーザー）"} · {formatDateTime(s.reviewed_at)}
                </p>
                {s.review_comment && <p className="type-body whitespace-pre-wrap">{s.review_comment}</p>}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function AutoResults({ kind, results }: { kind: "flow" | "code"; results: Record<string, unknown>[] | null }) {
  if (!results || results.length === 0) {
    return <p className="type-caption text-ink-muted-48">採点結果はありません。</p>;
  }
  return (
    <ul className="space-y-2">
      {results.map((r, i) => {
        const ok = r.ok === true;
        const error = typeof r.error === "string" ? r.error : null;
        const text =
          kind === "flow"
            ? String(r.label ?? "")
            : `${r.hidden ? "【非公開】" : ""}${r.label ? `【${String(r.label)}】` : ""}入力 ${String(r.input ?? "")} → 期待「${String(r.expected ?? "")}」${
                ok ? "" : error ? ` / ${error}` : ` / 実際「${String(r.actual ?? "")}」`
              }`;
        return (
          <li key={i} className="flex items-start gap-2 type-caption">
            <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-white ${ok ? "bg-success" : "bg-danger"}`}>
              {ok ? <CheckIcon size={10} strokeWidth={3} /> : <XIcon size={10} strokeWidth={3} />}
            </span>
            <span className={ok ? "text-ink-muted-80" : "text-ink"}>{text}</span>
          </li>
        );
      })}
    </ul>
  );
}
