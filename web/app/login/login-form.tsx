"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { login } from "@/api/auth-api";
import { ApiError } from "@/api/client";

type Errors = { id?: string; password?: string; form?: string };

export function LoginForm() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!id.trim()) next.id = "社員番号を入力してください。";
    if (!password) next.password = "パスワードを入力してください。";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await login({ employeeNo: id.trim(), password, rememberMe });
    } catch (e) {
      setSubmitting(false);
      // API のメッセージ（社員番号またはパスワードが正しくありません / 試行回数が多すぎます など）をそのまま出す
      setErrors({ form: e instanceof ApiError ? e.message : "サインインに失敗しました。" });
      return;
    }
    // 初期パスワードのままなら、ホーム側でパスワード変更へ移される
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
      <div>
        <label htmlFor="login-id" className="type-caption-strong mb-2 block px-1 text-ink-muted-80">
          社員番号
        </label>
        <input
          id="login-id"
          name="id"
          type="text"
          autoComplete="username"
          autoCapitalize="off"
          value={id}
          onChange={(e) => setId(e.target.value)}
          aria-invalid={errors.id ? true : undefined}
          aria-describedby={errors.id ? "login-id-error" : undefined}
          className="field"
          placeholder="例: T2026001"
        />
        {errors.id && (
          <p id="login-id-error" className="type-caption mt-2 px-1 text-danger">
            {errors.id}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="login-password" className="type-caption-strong mb-2 block px-1 text-ink-muted-80">
          パスワード
        </label>
        <div className="relative">
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "login-password-error" : undefined}
            className="field pr-20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="btn text-link type-caption absolute inset-y-0 right-2 px-3"
            aria-pressed={showPassword}
          >
            {showPassword ? "隠す" : "表示"}
          </button>
        </div>
        {errors.password && (
          <p id="login-password-error" className="type-caption mt-2 px-1 text-danger">
            {errors.password}
          </p>
        )}
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 px-1 type-caption text-ink-muted-80">
        <input
          type="checkbox"
          name="remember"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="size-[18px] accent-primary"
        />
        サインインしたままにする
      </label>

      <button type="submit" className="btn btn-primary btn-primary-lg w-full" disabled={submitting}>
        {submitting ? "サインインしています…" : "サインイン"}
      </button>
    </form>
  );
}
