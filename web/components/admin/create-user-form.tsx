"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createUser } from "@/api/admin-api";
import { ApiError } from "@/api/client";
import { IssuedPassword } from "./issued-password";

type Errors = { employeeNo?: string; name?: string; form?: string };

/** アカウントの発行。初期パスワードは API がランダムに作り、ここで一度だけ表示する */
export function CreateUserForm() {
  const router = useRouter();
  const [employeeNo, setEmployeeNo] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<{ employeeNo: string; name: string; password: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!employeeNo.trim()) next.employeeNo = "社員番号を入力してください。";
    if (!name.trim()) next.name = "氏名を入力してください。";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const { user, initialPassword } = await createUser({ employeeNo, name, role });
      setIssued({ employeeNo: user.employee_no, name: user.name, password: initialPassword });
      setEmployeeNo("");
      setName("");
      setRole("user");
      // 一覧を読み直す（同じページなので refresh でよい）
      router.refresh();
    } catch (err) {
      const fields = err instanceof ApiError ? err.body?.fieldErrors : undefined;
      setErrors({
        employeeNo: fields?.employeeNo?.[0],
        name: fields?.name?.[0],
        form: fields ? undefined : err instanceof ApiError ? err.message : "発行に失敗しました。",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-[1fr_1.4fr_auto_auto] sm:items-start">
        <div>
          <label htmlFor="new-employee-no" className="type-caption-strong mb-2 block px-1 text-ink-muted-80">
            社員番号
          </label>
          <input
            id="new-employee-no"
            value={employeeNo}
            onChange={(e) => setEmployeeNo(e.target.value)}
            autoComplete="off"
            placeholder="例: T2026002"
            aria-invalid={errors.employeeNo ? true : undefined}
            className="field"
          />
          {errors.employeeNo && <p className="type-caption mt-2 px-1 text-danger">{errors.employeeNo}</p>}
        </div>
        <div>
          <label htmlFor="new-name" className="type-caption-strong mb-2 block px-1 text-ink-muted-80">
            氏名
          </label>
          <input
            id="new-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            placeholder="例: 山田 花子"
            aria-invalid={errors.name ? true : undefined}
            className="field"
          />
          {errors.name && <p className="type-caption mt-2 px-1 text-danger">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="new-role" className="type-caption-strong mb-2 block px-1 text-ink-muted-80">
            役割
          </label>
          <select id="new-role" value={role} onChange={(e) => setRole(e.target.value as "user" | "admin")} className="field">
            <option value="user">受講者</option>
            <option value="admin">研修担当者</option>
          </select>
        </div>
        <div className="sm:pt-7">
          <button type="submit" className="btn btn-primary btn-primary-lg w-full sm:w-auto" disabled={submitting}>
            {submitting ? "発行しています…" : "発行する"}
          </button>
        </div>
      </form>

      {errors.form && (
        <p role="alert" className="type-caption mt-4 rounded-sm bg-danger/10 px-4 py-3 text-danger">
          {errors.form}
        </p>
      )}
      {issued && (
        <IssuedPassword
          title={`${issued.name}（${issued.employeeNo}）のアカウントを発行しました`}
          password={issued.password}
          onClose={() => setIssued(null)}
        />
      )}
    </div>
  );
}
