"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reviewSubmission } from "@/api/admin-api";
import { ApiError } from "@/api/client";

/** 承認・差し戻し。差し戻しにはコメントが必須 */
export function ReviewForm({ submissionId, kind }: { submissionId: string; kind: "flow" | "code" }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approve" | "reject") {
    if (decision === "reject" && !comment.trim()) {
      setError("差し戻すときは、直してほしい点をコメントに書いてください。");
      return;
    }
    setSubmitting(decision);
    setError(null);
    try {
      await reviewSubmission(submissionId, decision, comment.trim());
      // レビュー結果を表示し直す（同じページなので refresh でよい）
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "保存に失敗しました。");
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-3">
      <label htmlFor="review-comment" className="type-caption-strong block px-1 text-ink-muted-80">
        コメント（差し戻すときは必須）
      </label>
      <textarea
        id="review-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder={kind === "flow" ? "例: 60 点未満のときの処理が終了につながっていません" : "例: else の中で「不合格」を表示しましょう"}
        className="field min-h-28 resize-y rounded-lg py-3"
      />
      {error && (
        <p role="alert" className="type-caption text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary btn-primary-lg" onClick={() => decide("approve")} disabled={submitting !== null}>
          {submitting === "approve" ? "承認しています…" : "承認する"}
        </button>
        <button type="button" className="btn btn-secondary btn-secondary-lg" onClick={() => decide("reject")} disabled={submitting !== null}>
          {submitting === "reject" ? "差し戻しています…" : "差し戻す"}
        </button>
      </div>
      <p className="type-fine text-ink-muted-48">
        {kind === "flow"
          ? "承認すると、受講者はコードを提出できるようになります。"
          : "全5問のコードが承認されると、このレッスンが完了し、次のレッスンが解放されます。"}
      </p>
    </div>
  );
}
