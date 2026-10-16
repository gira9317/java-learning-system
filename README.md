# Java Training（新人研修向け Java 学習システム）

```
java-learning-system/
├─ api/   API サーバー（Hono + PostgreSQL）。DB と認証はここだけが持つ
└─ web/   画面（Next.js）。データは全部 api/ から取る
```

## 起動

```sh
# 1. API（ポート 4000）
cd api
cp .env.example .env      # 初回だけ
npm install
npm run db:up             # PostgreSQL を Docker で起動
npm run db:migrate        # テーブル作成（初回とマイグレーション追加時）
npm run db:seed           # 開発用データ（初回だけ）
npm run dev

# 2. 画面（ポート 3000）— 別のターミナルで
cd web
cp .env.example .env      # 初回だけ
npm install
npm run dev
```

http://localhost:3000 を開き、社員番号 `T2026001`（受講者）または `A0001`（管理者）、初期パスワード `initial-pass` でサインインする。初回はパスワード変更を求められる。

## リクエストの流れ

```
ブラウザ ──/api/*──> web（next.config.ts の rewrites）──> api/src/index.ts ──> routes/*.ts ──> PostgreSQL
Server Component ──（web/api/*.ts の関数）──────────────> 同上
```

- 画面から API を呼ぶ関数は `web/api/*-api.ts`。画面側のコードは DB に直接触れない
- API の入口は `api/src/index.ts`。`app.route("/lessons", lessons)` のように、どのファイルがどの URL を受け持つかはここに並ぶ

## API 一覧

| メソッドとパス | サインイン | ファイル |
|---|---|---|
| `POST /auth/login` | 不要 | `api/src/routes/auth.ts` |
| `POST /auth/logout` | 必要 | 同上 |
| `GET /auth/me` | 必要 | 同上 |
| `POST /auth/password` | 必要 | 同上 |
| `GET /lessons/catalog` | 不要 | `api/src/routes/lessons.ts` |
| `GET /lessons` | 必要（パスワード変更済み） | 同上 |
| `GET /lessons/:id` | 必要（パスワード変更済み） | 同上 |
| `PUT /lessons/:id/progress` | 必要（パスワード変更済み） | 同上 |

画面からは `/api` を付けて呼ぶ（例: `/api/lessons`）。

## 認証のしくみ

- サインインすると、ランダムなトークンを HttpOnly クッキー `session` に入れ、DB の `sessions` にはその SHA-256 だけを保存する
- `authMiddleware`（`api/src/middleware/authMiddleware.ts`）がクッキー → `sessions` → `users` とたどって `c.get("user")` に入れる。ユーザー ID はクライアントから受け取らない
- 状態を変えるリクエストは、`originCheckMiddleware` で画面のオリジンからの JSON だけを受け付ける（CSRF 対策）
- 初期パスワードのユーザーは `requirePasswordChanged` で止め、`/auth/*` 以外を 403 にする

## よく使うコマンド（api/ で実行）

| コマンド | 内容 |
|---|---|
| `npm run user:create -- <社員番号> <氏名> <初期パスワード> [user\|admin]` | アカウント発行 |
| `npm run db:reset` | DB を空にして、マイグレーションと開発用データを入れ直す |
| `npm run db:psql` | psql で接続 |

テーブルを変えるときは、`api/db/migrations/` に `0002_xxx.sql` のような新しいファイルを足して `npm run db:migrate` する（既存のファイルは書き換えない）。
