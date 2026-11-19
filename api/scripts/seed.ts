/*
 * 開発用の初期データ。何度実行してもよい（作成済みのユーザーや進捗はそのまま残す）。
 * Docker で起動したときは、起動のたびに実行される。
 *   npm run db:seed
 * 最後に db/seed.sql（講義の解説動画 URL など、SQL で書いた初期データ）も流す。
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
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
  [17, "継承とインターフェース", "支払い方法・給与・通知など、種類ごとに振る舞いが変わる処理を、継承とインターフェースで組み立てます。", 90],
  [18, "コレクション（List と Map）", "買い物かご・在庫・集計・予約の重複チェックを、List と Map で実装します。", 90],
  [19, "小さな業務システムを作る", "貸出・会計・勤怠・ToDo・会議室予約を、package に分けたクラスで作ります。", 120],
  [20, "自由制作", "自動販売機やクイズなど、正解が1つではない課題を、自分で設計して作ります。", 180],
  [21, "オセロを作る", "盤面の表示から裏返しのルール、コンピュータとの対戦、画面の盤での対戦まで、少しずつ作ります。", 180],
] as const;

/** レッスンの種類。intro・refactor・advanced はコードのみ、core はフロー図 → コード */
function levelOf(id: number) {
  if (id >= 11 && id <= 15) return "intro";
  if (id === 16) return "refactor";
  if (id >= 17) return "advanced";
  return "core";
}

/** フォルダ（package）とファイルを作って書けるレッスン（クラス以降） */
function multiFileOf(id: number) {
  return id === 9 || id === 10 || id >= 16;
}

// 開発用アカウント。初期パスワードは共通で、初回サインイン時に変更を求められる
const INITIAL_PASSWORD = process.env.SEED_INITIAL_PASSWORD ?? "initial-pass";
const accounts = [
  { employeeNo: "A0001", name: "研修 担当", role: "admin" as const },
  { employeeNo: "T2026001", name: "新人 太郎", role: "user" as const },
];

for (const [i, [id, title, summary, minutes]] of lessons.entries()) {
  await pool.query(
    `
    INSERT INTO lessons (id, title, summary, minutes, sort_order, level, multi_file)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id)
    DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary,
                  minutes = EXCLUDED.minutes, sort_order = EXCLUDED.sort_order, level = EXCLUDED.level,
                  multi_file = EXCLUDED.multi_file
    `,
    [id, title, summary, minutes, i + 1, levelOf(id), multiFileOf(id)],
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

// api/ で実行する（npm run db:seed でも、Docker の起動時でも）
const seedSql = await readFile(join(process.cwd(), "db", "seed.sql"), "utf8");
const videos = await pool.query(seedSql);
console.log(`講義の動画: ${videos.rowCount ?? 0} 件を登録（登録済みの講義はそのまま）`);

await pool.end();
