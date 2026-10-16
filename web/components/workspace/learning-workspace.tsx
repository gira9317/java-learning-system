"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/api/client";
import { updateProgress } from "@/api/lessons-api";
import { BookIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { StatusChip } from "@/components/status-chip";
import type { FlowCheck } from "@/lib/flow";
import { pad, type Lesson } from "@/lib/lessons";
import { CodePane, type TestResult } from "./code-pane";
import { FlowPane } from "./flow-pane";
import { LessonMaterial } from "./lesson-material";
import { PaneHeader, ResizablePanes } from "./resizable-panes";

export function LearningWorkspace({ lesson, lessons }: { lesson: Lesson; lessons: Lesson[] }) {
  const router = useRouter();
  const [codeResults, setCodeResults] = useState<TestResult[] | null>(null);
  const [flowChecks, setFlowChecks] = useState<FlowCheck[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const completed = lesson.status === "completed";

  const total = lessons.length;
  const index = lessons.findIndex((l) => l.id === lesson.id);
  const prev = lessons[index - 1];
  const next = lessons[index + 1];

  async function complete() {
    setSaving(true);
    setSaveError(null);
    try {
      await updateProgress(lesson.id, "completed");
      // サーバーの進捗（このレッスンの完了・次レッスンの解放）を読み直す
      router.refresh();
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-44px)] min-h-0 flex-none flex-col">
      {/* sub-nav-frosted */}
      <div className="frosted z-20 flex h-[52px] shrink-0 items-center justify-between gap-4 border-b border-black/[0.08] px-4 sm:px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="hidden type-caption shrink-0 text-ink-muted-48 sm:inline">
            Lesson {pad(lesson.id)} / {total}
          </span>
          <h1 className="truncate type-body-strong sm:type-tagline">
            <span className="text-ink-muted-48 sm:hidden">{pad(lesson.id)} </span>
            {lesson.title}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-[3px] md:flex" aria-label={`全${total}レッスン中 ${lesson.id} 番目`}>
            {lessons.map((l) => (
              <span
                key={l.id}
                className={`h-1 w-4 rounded-full ${
                  l.id === lesson.id ? "bg-primary" : l.status === "completed" ? "bg-ink" : "bg-chip"
                }`}
              />
            ))}
          </div>
          <span className="hidden sm:inline-flex">
            <StatusChip status={completed ? "completed" : "in-progress"} />
          </span>
          <nav className="flex items-center gap-1.5">
            {prev ? (
              <Link href={`/lessons/${prev.id}`} className="btn btn-icon size-8" aria-label="前のレッスン">
                <ChevronLeftIcon size={15} />
              </Link>
            ) : (
              <span className="btn btn-icon size-8 opacity-40" aria-hidden>
                <ChevronLeftIcon size={15} />
              </span>
            )}
            {next && (next.status !== "locked" || completed) ? (
              <Link href={`/lessons/${next.id}`} className="btn btn-icon size-8" aria-label="次のレッスン">
                <ChevronRightIcon size={15} />
              </Link>
            ) : (
              <span className="btn btn-icon size-8 opacity-40" aria-hidden>
                <ChevronRightIcon size={15} />
              </span>
            )}
          </nav>
        </div>
      </div>

      <ResizablePanes initial={[30, 37, 33]} labels={["教材", "コード", "フロー図"]}>
        <>
          <PaneHeader icon={<BookIcon size={16} />} title="教材" />
          <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
            <LessonMaterial lesson={lesson} />
          </div>
        </>
        <CodePane onGraded={setCodeResults} />
        <FlowPane onGraded={setFlowChecks} />
      </ResizablePanes>

      {/* floating-sticky-bar：採点結果と学習完了は分離して表示する */}
      <div className="frosted z-20 flex shrink-0 items-center justify-between gap-4 border-t border-black/[0.08] px-4 py-2.5 sm:min-h-16 sm:px-8 sm:py-3">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-6">
          <span className="hidden type-caption-strong text-ink-muted-80 sm:inline">採点結果</span>
          <Score label="Javaコード" passed={codeResults?.filter((r) => r.ok).length} total={codeResults?.length} />
          <Score label="フロー図" passed={flowChecks?.filter((c) => c.ok).length} total={flowChecks?.length} />
        </div>
        <div className="flex items-center gap-4">
          {saveError ? (
            <span className="type-caption text-danger" role="alert">
              {saveError}
            </span>
          ) : (
            <span className="hidden type-caption text-ink-muted-48 xl:inline">満点でなくても完了できます</span>
          )}
          {completed ? (
            next ? (
              <Link href={`/lessons/${next.id}`} className="btn btn-primary btn-primary-lg">
                <span className="sm:hidden">次へ</span>
                <span className="hidden sm:inline">Lesson {pad(next.id)} へ進む</span>
                <ChevronRightIcon size={16} />
              </Link>
            ) : (
              <Link href="/home" className="btn btn-primary btn-primary-lg">
                コースを修了しました
              </Link>
            )
          ) : (
            <button type="button" className="btn btn-primary btn-primary-lg" onClick={complete} disabled={saving}>
              {saving ? "保存しています…" : "学習を完了する"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Score({ label, passed, total }: { label: string; passed?: number; total?: number }) {
  const graded = total !== undefined && passed !== undefined;
  const perfect = graded && passed === total;
  return (
    <span className="flex items-baseline gap-2 type-fine sm:type-caption">
      <span className="text-ink-muted-80">{label}</span>
      {graded ? (
        <span className={`type-caption-strong sm:type-body-strong ${perfect ? "text-success" : "text-ink"}`}>
          {passed}
          <span className="type-caption text-ink-muted-48"> / {total}</span>
        </span>
      ) : (
        <span className="text-ink-muted-48">未採点</span>
      )}
    </span>
  );
}
