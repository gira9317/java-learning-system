/*
 * 開発用の初期データ。何度実行してもよい（作成済みのユーザーや進捗はそのまま残す）。
 * Docker で起動したときは、起動のたびに実行される。
 *   npm run db:seed
 */
import { pool } from "../src/db.js";
import { createAccount } from "../src/lib/accounts.js";

const lessons = [
  [11, "はじめての実行と文字の表示", "用意されたコードを動かし、表示する文字を1か所ずつ変えてみます。", 15],
  [12, "数字と文字を区別しよう", "数字の計算と、文字をそのまま表示する違いを試します。", 15],
  [13, "変数に値を入れてみよう", "名前の付いた箱をイメージし、数や文字を覚えて表示します。", 20],
  [14, "足し算から始める計算", "足し算・引き算・掛け算・割り算・余りを1つずつ試します。", 20],
  [15, "入力を受け取ってみよう", "用意された読み込みの行を使い、入力を変えて同じコードを動かします。", 20],
  [1, "Javaの基本とHello World", "プログラムの構造と、画面に文字を表示する方法を学びます。", 30],
  [2, "変数とデータ型", "int・double・String などの型と、値の代入・計算を学びます。", 40],
  [3, "条件分岐について学ぶ", "if文を使って条件による処理の分岐を実装します。", 45],
  [4, "switch文", "複数の値による分岐を switch で簡潔に書きます。", 35],
  [5, "繰り返し — for文", "決まった回数の繰り返しを for 文で表現します。", 45],
  [6, "繰り返し — while文", "条件を満たす間だけ繰り返す処理を学びます。", 40],
  [7, "配列", "複数の値をまとめて扱い、ループで処理します。", 50],
  [8, "メソッド", "処理に名前をつけて分割し、再利用できるようにします。", 50],
  [9, "クラスとオブジェクト", "データと振る舞いをまとめるオブジェクト指向の基礎です。", 60],
  [16, "読みやすいコードと責務の分け方", "命名・早期リターン・責務分割・コメント・オブジェクトへの頼み方を、動くコードの改善で学びます。", 90],
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
    INSERT INTO lessons (id, title, summary, minutes, sort_order, level)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id)
    DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary,
                  minutes = EXCLUDED.minutes, sort_order = EXCLUDED.sort_order, level = EXCLUDED.level
    `,
    [id, title, summary, minutes, i + 1, id === 16 ? "refactor" : id >= 11 && id <= 15 ? "intro" : "core"],
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

await pool.end();
