"use client";

import { useState } from "react";
import { ApiError } from "@/api/client";
import { setLectureCompleted } from "@/api/lectures-api";
import { CheckIcon } from "@/components/icons";

/** 「視聴・読了済み」のチェック。押すとすぐ表示を切り替え、失敗したら元に戻す */
export function CompleteToggle({ lectureId, initial }: { lectureId: number; initial: boolean }) {
  const [completed, setCompleted] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !completed;
    setCompleted(next);
    setSaving(true);
    setError(null);
    try {
      await setLectureCompleted(lectureId, next);
    } catch (e) {
      setCompleted(!next);
      setError(e instanceof ApiError ? e.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        aria-pressed={completed}
        className={completed ? "btn btn-secondary btn-secondary-lg" : "btn btn-primary btn-primary-lg"}
      >
        {completed && <CheckIcon size={16} strokeWidth={2.4} />}
        {completed ? "視聴・読了済み" : "視聴・読了済みにする"}
      </button>
      {error && <p className="type-caption mt-2 text-danger">{error}</p>}
    </div>
  );
}
