"use client";

import { useState } from "react";
import { resetPassword } from "@/api/admin-api";
import { ApiError } from "@/api/client";
import { IssuedPassword } from "./issued-password";

/** パスワードの再発行。本人のサインインはすべて切れ、次回は新しい初期パスワードで入って変更する */
export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!window.confirm(`${name} さんのパスワードを再発行しますか？\n今のパスワードは使えなくなり、サインイン中の端末もすべてサインアウトされます。`)) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await resetPassword(userId);
      setPassword(result.initialPassword);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "再発行に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn btn-pearl" onClick={onClick} disabled={submitting}>
        {submitting ? "再発行しています…" : "パスワードを再発行"}
      </button>
      {error && <p className="type-caption mt-2 text-danger">{error}</p>}
      {password && (
        <IssuedPassword title={`${name} さんの新しい初期パスワード`} password={password} onClose={() => setPassword(null)} />
      )}
    </div>
  );
}
