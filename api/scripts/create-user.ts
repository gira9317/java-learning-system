/*
 * アカウントを発行する。
 *   npm run user:create -- <社員番号> <氏名> <初期パスワード> [user|admin]
 * 例: npm run user:create -- T2026002 "山田 花子" Init-2026 user
 */
import { pool } from "../src/db.js";
import { createAccount } from "../src/lib/accounts.js";

const [employeeNo, name, password, role = "user"] = process.argv.slice(2);

if (!employeeNo || !name || !password || (role !== "user" && role !== "admin")) {
  console.error("使い方: npm run user:create -- <社員番号> <氏名> <初期パスワード> [user|admin]");
  process.exit(1);
}

try {
  const user = await createAccount({ employeeNo, name, password, role });
  console.log(`作成しました: ${user.name}（${user.employee_no} / ${user.role}）。初回サインイン時にパスワード変更が必要です。`);
} catch (error) {
  // 23505 = 一意制約違反（社員番号の重複）
  if ((error as { code?: string }).code === "23505") {
    console.error(`社員番号 ${employeeNo.toUpperCase()} はすでに登録されています。`);
    process.exitCode = 1;
  } else {
    throw error;
  }
} finally {
  await pool.end();
}
