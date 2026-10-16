/*
 * 開発用の初期データ。何度実行してもよい（作成済みのユーザーはそのまま残す）。
 *   npm run db:seed
 */
import { pool } from "../src/db.js";
import { createAccount } from "../src/lib/accounts.js";

const lessons = [
  [1, "Javaの基本とHello World", "プログラムの構造と、画面に文字を表示する方法を学びます。", 30],
  [2, "変数とデータ型", "int・double・String などの型と、値の代入・計算を学びます。", 40],
  [3, "条件分岐について学ぶ", "if文を使って条件による処理の分岐を実装します。", 45],
  [4, "switch文", "複数の値による分岐を switch で簡潔に書きます。", 35],
  [5, "繰り返し — for文", "決まった回数の繰り返しを for 文で表現します。", 45],
  [6, "繰り返し — while文", "条件を満たす間だけ繰り返す処理を学びます。", 40],
  [7, "配列", "複数の値をまとめて扱い、ループで処理します。", 50],
  [8, "メソッド", "処理に名前をつけて分割し、再利用できるようにします。", 50],
  [9, "クラスとオブジェクト", "データと振る舞いをまとめるオブジェクト指向の基礎です。", 60],
  [10, "例外処理", "try / catch でエラーに備えた堅牢なコードを書きます。", 45],
] as const;

// 開発用アカウント。初期パスワードは共通で、初回サインイン時に変更を求められる
const INITIAL_PASSWORD = process.env.SEED_INITIAL_PASSWORD ?? "initial-pass";
const accounts = [
  { employeeNo: "A0001", name: "研修 担当", role: "admin" as const },
  { employeeNo: "T2026001", name: "新人 太郎", role: "user" as const },
];

for (const [i, [id, title, summary, minutes]] of lessons.entries()) {
  await pool.query(
    `
    INSERT INTO lessons (id, title, summary, minutes, sort_order)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id)
    DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary,
                  minutes = EXCLUDED.minutes, sort_order = EXCLUDED.sort_order
    `,
    [id, title, summary, minutes, i + 1],
  );
}
console.log(`レッスン: ${lessons.length} 件`);

for (const account of accounts) {
  const existing = await pool.query(`SELECT 1 FROM users WHERE employee_no = $1`, [account.employeeNo]);
  if (existing.rowCount) {
    console.log(`ユーザー: ${account.employeeNo} は作成済み`);
    continue;
  }
  await createAccount({ ...account, password: INITIAL_PASSWORD });
  console.log(`ユーザー: ${account.employeeNo}（${account.role}）を作成 — 初期パスワード ${INITIAL_PASSWORD}`);
}

// 受講者は「Lesson 01・02 完了、03 学習中」から始める
await pool.query(
  `
  INSERT INTO lesson_progress (user_id, lesson_id, status)
  SELECT u.id, v.lesson_id, v.status
  FROM users u,
       (VALUES (1, 'completed'), (2, 'completed'), (3, 'in-progress')) AS v(lesson_id, status)
  WHERE u.employee_no = 'T2026001'
  ON CONFLICT (user_id, lesson_id)
  DO UPDATE SET status = EXCLUDED.status, updated_at = now()
  `,
);
console.log("進捗: T2026001 に Lesson 01–02 完了 / 03 学習中 を設定");

await pool.end();
