"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { changePassword } from "@/api/auth-api";
import { ApiError } from "@/api/client";

type Field = "currentPassword" | "newPassword" | "confirm";
type Errors = Partial<Record<Field | "form", string>>;

export function PasswordForm() {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!values.currentPassword) next.currentPassword = "現在のパスワードを入力してください。";
    if (values.newPassword.length < 8) next.newPassword = "新しいパスワードは 8 文字以上にしてください。";
    if (values.confirm !== values.newPassword) next.confirm = "確認用のパスワードが一致しません。";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
    } catch (e) {
      const newPasswordError = e instanceof ApiError ? e.body?.fieldErrors?.newPassword?.[0] : undefined;
      setErrors(
        newPasswordError
          ? { newPassword: newPasswordError }
          : { form: e instanceof ApiError ? e.message : "変更に失敗しました。" },
      );
      setSubmitting(false);
      return;
    }
    router.replace("/home");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-10 space-y-4">
      {errors.form && (
        <p role="alert" className="type-caption rounded-sm bg-danger/10 px-4 py-3 text-danger">
          {errors.form}
        </p>
      )}
      <PasswordField
        id="currentPassword"
        label="現在のパスワード"
        autoComplete="current-password"
        value={values.currentPassword}
        error={errors.currentPassword}
        onChange={(v) => setValues((s) => ({ ...s, currentPassword: v }))}
      />
      <PasswordField
        id="newPassword"
        label="新しいパスワード（8 文字以上）"
        autoComplete="new-password"
        value={values.newPassword}
        error={errors.newPassword}
        onChange={(v) => setValues((s) => ({ ...s, newPassword: v }))}
      />
      <PasswordField
        id="confirm"
        label="新しいパスワード（確認）"
        autoComplete="new-password"
        value={values.confirm}
        error={errors.confirm}
        onChange={(v) => setValues((s) => ({ ...s, confirm: v }))}
      />

      <button type="submit" className="btn btn-primary btn-primary-lg w-full" disabled={submitting}>
        {submitting ? "変更しています…" : "変更して始める"}
      </button>
    </form>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  error,
  onChange,
}: {
  id: Field;
  label: string;
  autoComplete: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={`pw-${id}`} className="type-caption-strong mb-2 block px-1 text-ink-muted-80">
        {label}
      </label>
      <input
        id={`pw-${id}`}
        name={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `pw-${id}-error` : undefined}
        className="field"
      />
      {error && (
        <p id={`pw-${id}-error`} className="type-caption mt-2 px-1 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
