# Java Training（新人研修向け Java 学習システム）

新人研修のための Java 学習システムです。講義（解説動画と資料）と、コード演習（フロー図 → Java コードの順に提出し、研修担当者がレビューする）があります。

## まず動かしてみる（Docker）

必要なもの: [Docker Desktop](https://www.docker.com/products/docker-desktop/)（起動しておく）

```sh
git clone https://github.com/gira9317/java-learning-system.git
cd java-learning-system
docker compose up --build
```

初回はイメージの作成に数分かかります。`web-1` のログが出たら、ブラウザで **http://localhost:3000** を開きます。

| 社員番号 | 役割 | 初期パスワード |
|---|---|---|
| `T2026001` | 受講者 | `initial-pass` |
| `A0001` | 研修担当者（管理画面） | `initial-pass` |

初回のサインインでパスワードの変更を求められます。

- 止めるとき: `Ctrl+C`（またはほかのターミナルで `docker compose down`）
- データを消して最初からやり直すとき: `docker compose down -v` のあと、もう一度 `docker compose up --build`
- 3000 番ポートがほかで使われているとき: `WEB_PORT=3100 docker compose up --build` で http://localhost:3100 を開く

## 構成

```
java-learning-system/
├─ api/          API サーバー（Hono + PostgreSQL）。DB と認証はここだけが持つ
├─ web/          画面（Next.js）。データは全部 api/ から取る
└─ compose.yaml  上の「まず動かしてみる」用。DB・API・画面をまとめて起動する
```

## 開発するときの起動

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

| メソッドとパス | 権限 | ファイル |
|---|---|---|
| `POST /auth/login` | 不要 | `api/src/routes/auth.ts` |
| `POST /auth/logout` / `GET /auth/me` / `POST /auth/password` | サインイン | 同上 |
| `GET /lectures` / `GET /lectures/:id` | サインイン（パスワード変更済み） | `api/src/routes/lectures.ts` |
| `PUT /lectures/:id/progress` | 同上（視聴・読了済みのチェック） | 同上 |
| `GET /lessons/catalog` | 不要 | `api/src/routes/lessons.ts` |
| `GET /lessons` / `GET /lessons/:id` | サインイン（パスワード変更済み） | 同上 |
| `GET /lessons/:id/submissions` / `POST /lessons/:id/submissions` | 同上（フロー図・コードの提出） | 同上 |
| `PUT /lessons/:id/drafts/:kind` | 同上（フロー図・コードの下書きの自動保存） | 同上 |
| `GET /admin/summary` | 研修担当者 | `api/src/routes/admin.ts` |
| `GET /admin/users` / `POST /admin/users` / `GET /admin/users/:id` / `POST /admin/users/:id/reset-password` | 研修担当者 | 同上 |
| `GET /admin/submissions` / `GET /admin/submissions/:id` / `POST /admin/submissions/:id/approve` / `POST /admin/submissions/:id/reject` | 研修担当者 | 同上 |
| `GET /admin/lectures` / `GET /admin/lectures/:id` / `PUT /admin/lectures/:id` | 研修担当者（動画・資料の登録） | 同上 |

画面からは `/api` を付けて呼ぶ（例: `/api/lessons`）。

## 画面

| URL | 内容 |
|---|---|
| `/home` | 受講者のホーム |
| `/lectures`、`/lectures/:id` | 講義（左に解説動画、右に資料）。順番は自由 |
| `/lessons/:id` | コード演習（教材・コード・フロー図）。フロー図 → コードの順に提出し、承認されると次へ進める |
| `/admin` | レビュー待ちの一覧（研修担当者） |
| `/admin/users` | 受講者の一覧・アカウント発行・パスワード再発行 |
| `/admin/lectures` | 講義の動画 URL と資料（Markdown）の登録 |

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
