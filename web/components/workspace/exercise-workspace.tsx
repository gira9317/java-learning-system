"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/api/client";
import {
  saveDraft,
  submit,
  type CodeContent,
  type FlowContent,
  type LessonSubmissions,
  type StageStatus,
} from "@/api/submissions-api";
import { BookIcon, ChevronRightIcon, CodeIcon, FlowIcon, XIcon } from "@/components/icons";
import type { FlowCheck } from "@/lib/flow";
import { pad, type Lesson } from "@/lib/lessons";
import { CodePane, type TestResult } from "./code-pane";
import { FlowPane } from "./flow-pane";
import { LessonHeader } from "./lesson-header";
import { ProblemStatement } from "./lesson-material";
import { ResizablePanes } from "./resizable-panes";
import type { SubmitControl } from "./submission-status";

const FLOW = 0;
const CODE = 1;

/**
 * コード演習の「演習」ページ。
 * 普段は「フロー図」「コード」を切り替えて 1 つを画面いっぱいに使い、「並べて表示」で左右に並べられる。
 * 問題文は右から開くパネル。フロー図 → コードの順に提出し、両方が承認されるとレッスンが完了する。
 */
export function ExerciseWorkspace({
  lesson,
  lessons,
  submissions,
}: {
  lesson: Lesson;
  lessons: Lesson[];
  submissions: LessonSubmissions;
}) {
  const router = useRouter();
  const [codeResults, setCodeResults] = useState<TestResult[] | null>(null);
  const [flowChecks, setFlowChecks] = useState<FlowCheck[] | null>(null);
  const [submitting, setSubmitting] = useState<"flow" | "code" | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // 今の段階に合わせて最初のタブを選ぶ（フロー図が未承認ならフロー図から）
  const [active, setActive] = useState(submissions.flow.status === "approved" ? CODE : FLOW);
  const [split, setSplit] = useState(false);
  // 問題文は、まだ何も提出していないときだけ最初から開いておく
  const [problemOpen, setProblemOpen] = useState(submissions.flow.status === "none");
  // フロー図とコードの両方が承認されると、API がレッスンを完了にする
  const completed = lesson.status === "completed";

  const { latest, drafts } = submissions;
  const flowControl: SubmitControl = {
    stage: submissions.flow,
    comment: latest.flow?.review_comment ?? null,
    submitting: submitting === "flow",
  };
  const codeControl: SubmitControl = {
    stage: submissions.code,
    comment: latest.code?.review_comment ?? null,
    blockedReason: "フロー図が承認されると、コードを提出できるようになります。",
    submitting: submitting === "code",
  };

  const next = lessons[lessons.findIndex((l) => l.id === lesson.id) + 1];

  async function send(
    body:
      | { kind: "flow"; content: FlowContent; autoResults: Record<string, unknown>[] }
      | { kind: "code"; content: CodeContent; autoResults: Record<string, unknown>[] },
  ) {
    setSubmitting(body.kind);
    setSubmitError(null);
    try {
      await submit(lesson.id, body);
      // 提出の状態（レビュー待ち）をサーバーから読み直す。同じページなので refresh でよい
      router.refresh();
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : "提出に失敗しました。");
    } finally {
      setSubmitting(null);
    }
  }

  const viewTabs = [
    { index: FLOW, label: "フロー図", icon: <FlowIcon size={15} />, status: submissions.flow.status },
    { index: CODE, label: "コード", icon: <CodeIcon size={15} />, status: submissions.code.status },
  ];

  return (
    <div className="flex h-[calc(100dvh-44px)] min-h-0 flex-none flex-col">
      <LessonHeader lesson={lesson} lessons={lessons} active="exercise" />

      {/* ツールバー：表示の切り替え・問題・採点結果・提出の状況 */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline bg-canvas px-3 py-1.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div role="tablist" aria-label="表示する画面" className="flex gap-1 rounded-full bg-parchment p-1">
            {viewTabs.map((tab) => {
              // 並べて表示しているときは、両方とも表示中として見せる
              const selected = split ? true : active === tab.index;
              return (
                <button
                  key={tab.label}
                  type="button"
                  role="tab"
                  aria-selected={active === tab.index}
                  onClick={() => {
                    setActive(tab.index);
                    setSplit(false);
                  }}
                  className={`btn min-h-8 gap-1.5 rounded-full px-3 type-caption ${
                    selected ? "border border-hairline bg-canvas font-semibold text-ink" : "border border-transparent text-ink-muted-80"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  <StageDot status={tab.status} />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setSplit((s) => !s)}
            aria-pressed={split}
            className={`btn hidden min-h-8 rounded-full px-3 type-caption lg:inline-flex ${
              split ? "bg-ink text-white" : "border border-hairline text-ink-muted-80"
            }`}
          >
            並べて表示
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {submitError && (
            <span className="hidden type-caption text-danger md:inline" role="alert">
              {submitError}
            </span>
          )}
          <span className="hidden items-center gap-4 xl:flex">
            <Score label="フロー図" passed={flowChecks?.filter((c) => c.ok).length} total={flowChecks?.length} />
            <Score label="コード" passed={codeResults?.filter((r) => r.ok).length} total={codeResults?.length} />
          </span>
          {completed &&
            (next ? (
              <Link href={`/lessons/${next.id}`} className="btn btn-primary">
                Lesson {pad(next.id)} へ
                <ChevronRightIcon size={14} />
              </Link>
            ) : (
              <Link href="/home" className="btn btn-primary">
                コースを修了しました
              </Link>
            ))}
          <button
            type="button"
            onClick={() => setProblemOpen((o) => !o)}
            aria-expanded={problemOpen}
            aria-controls="problem-panel"
            className={`btn min-h-8 gap-1.5 rounded-full px-3 type-caption ${
              problemOpen ? "bg-ink text-white" : "border border-hairline text-ink"
            }`}
          >
            <BookIcon size={14} />
            問題
          </button>
        </div>
      </div>
      {submitError && (
        <p role="alert" className="shrink-0 bg-danger/10 px-4 py-1.5 type-caption text-danger md:hidden">
          {submitError}
        </p>
      )}

      {/* 作業領域と問題パネルを横に並べる。問題を開くと、その分だけフロー図・コードの領域が狭くなる */}
      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ResizablePanes
            initial={[45, 55]}
            labels={["フロー図", "コード"]}
            active={active}
            onActiveChange={setActive}
            split={split}
            hideTabs
          >
            <FlowPane
              onGraded={setFlowChecks}
              initial={drafts.flow?.content ?? (latest.flow?.content as FlowContent | undefined)}
              submit={flowControl}
              onSubmit={(content, checks) => send({ kind: "flow", content, autoResults: checks })}
              saveDraft={(content, options) => saveDraft(lesson.id, "flow", content, options)}
            />
            <CodePane
              onGraded={setCodeResults}
              initial={drafts.code?.content ?? (latest.code?.content as CodeContent | undefined)}
              submit={codeControl}
              onSubmit={(content, results) => send({ kind: "code", content, autoResults: results })}
              saveDraft={(content, options) => saveDraft(lesson.id, "code", content, options)}
            />
          </ResizablePanes>
        </div>

        {/* 問題文：md 以上は右に並べ（作業領域が縮む）、それより狭い画面では全面に重ねる */}
        {problemOpen && (
          <aside
            id="problem-panel"
            aria-label="問題"
            className="absolute inset-0 z-30 flex flex-col bg-canvas md:static md:w-[380px] md:shrink-0 md:border-l md:border-hairline lg:w-[420px]"
          >
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-hairline px-5">
              <h2 className="type-caption-strong">問題</h2>
              <button type="button" className="btn btn-icon size-8" aria-label="問題を閉じる" onClick={() => setProblemOpen(false)}>
                <XIcon size={15} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <ProblemStatement lesson={lesson} />
              {!completed && (
                <p className="type-fine mt-6 text-ink-muted-48">フロー図とコードの両方が承認されると、次のレッスンに進めます。</p>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/** タブに付ける提出の段階の印 */
function StageDot({ status }: { status: StageStatus }) {
  const style: Record<StageStatus, { className: string; label: string }> = {
    none: { className: "border border-ink-muted-48", label: "未提出" },
    pending: { className: "bg-primary", label: "レビュー待ち" },
    approved: { className: "bg-success", label: "承認済み" },
    rejected: { className: "bg-danger", label: "要再提出" },
  };
  return (
    <span className="flex items-center gap-1 type-fine font-normal text-ink-muted-48">
      <span className={`size-2 rounded-full ${style[status].className}`} aria-hidden />
      <span className="hidden sm:inline">{style[status].label}</span>
    </span>
  );
}

function Score({ label, passed, total }: { label: string; passed?: number; total?: number }) {
  const graded = total !== undefined && passed !== undefined;
  const perfect = graded && passed === total;
  return (
    <span className="flex items-baseline gap-1.5 type-caption">
      <span className="text-ink-muted-80">{label}</span>
      {graded ? (
        <span className={`type-caption-strong ${perfect ? "text-success" : "text-ink"}`}>
          {passed}
          <span className="font-normal text-ink-muted-48"> / {total}</span>
        </span>
      ) : (
        <span className="text-ink-muted-48">未採点</span>
      )}
    </span>
  );
}
