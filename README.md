# Java Training

プログラミング未経験者から少し経験のある新人までを対象にした、Java研修用の学習システムです。講義の動画・資料で学び、ブラウザ上のコード演習を実行・採点・提出して、研修担当者のレビューを受けます。

現在の教材は、**5章・69講義、16レッスン・80問のコード演習**です。講義には初心者向けの導入、各5問の4択小テスト、任意の発展資料があります。

## 目次

- [できること・学習の流れ](#できること学習の流れ)
- [構成と必要なもの](#構成と必要なもの)
- [ローカル開発環境を起動する](#ローカル開発環境を起動する)
- [Dockerでまとめて起動する](#dockerでまとめて起動する)
- [環境変数](#環境変数)
- [画面とカリキュラム](#画面とカリキュラム)
- [教材を編集・追加する](#教材を編集追加する)
- [アカウント・データベースの管理](#アカウントデータベースの管理)
- [動作確認・ビルド](#動作確認ビルド)
- [内部構成とAPI](#内部構成とapi)
- [トラブルシューティング](#トラブルシューティング)

## できること・学習の流れ

### 受講者

1. 配布された社員番号と初期パスワードでサインインし、パスワードを変更します。
2. 講義の動画と資料を確認します。講義は必要なところから自由に閲覧できます。
3. 小テストで理解を確認し、任意のOption資料で学習を深めます。
4. コード演習で、問題ごとに下書き・実行・採点・提出を行います。
5. レビューで差し戻された場合は、コメントを見て修正・再提出します。
6. レッスンの全5問のコードが承認されると、次のレッスンが解放されます。

通常の演習は「フロー図の提出・承認 → コードの提出・承認」の順です。**入門編とリファクタリング演習はコードのみ**で取り組めます。自動採点は動作を確認し、命名・指定構文・責務分割などは担当者がレビューします。

講義の「視聴・読了済み」は受講者が付けるチェックです。4択小テストの解答は画面内の自己確認用で、サーバーへの成績保存やレッスンの解放条件には使いません。

### 研修担当者

- 受講者のアカウント発行・パスワード再発行・進捗確認
- 問題ごとのフロー図・コードの確認、承認・差し戻し
- 講義の動画URLとMarkdown資料の登録・編集

自己登録の画面はありません。アカウントは担当者が発行します。

## 構成と必要なもの

```text
java-learning-system/
├─ web/                     Next.js / React / Tailwind CSSの画面
│  ├─ app/                  ページとルーティング
│  ├─ components/           共通UI・講義・演習ワークスペース
│  ├─ api/                  APIを呼び出す関数
│  └─ lib/                  型・認証・表示用の補助
├─ api/                     Hono / PostgreSQLのAPI
│  ├─ src/routes/           認証・講義・演習・管理のエンドポイント
│  ├─ src/lib/              採点・進捗・教材読み込みなど
│  ├─ db/migrations/        DBスキーマの変更履歴
│  ├─ scripts/              初期化・教材取り込み・検証
│  ├─ content/lectures/     講義MD・導入・小テスト・Optionの元データ
│  └─ content/lessons/      演習教材MD・問題文・採点用テスト
├─ runner/                  JavaをDocker内でコンパイル・実行
└─ compose.yaml             デモ用に全サービスを起動
```

| 項目 | 使用するもの |
| --- | --- |
| ローカルのNode.js | 24系を使用するとDockerfileの実行環境と揃います |
| パッケージ管理 | npm。`web/`・`api/`・`runner/`それぞれで依存をインストール |
| Docker | Docker Desktopなど、Linuxコンテナを起動できるDocker環境 |
| データベース | PostgreSQL 17（Composeで起動） |
| Java実行環境 | `eclipse-temurin:21-jdk`（runnerがDockerで取得） |

PCへのJDKの直接インストールは不要です。ローカル開発でも、DBとJavaの実行にはDockerを使います。

## ローカル開発環境を起動する

画面・API・runnerはPC上の開発サーバーで動かします。画面やTypeScriptの変更を保存すると反映される構成です。以下はPowerShellの例です。現在の開発版は`develop`にあるため、招待された人もブランチを指定して取得してください。

### 1. 初回の準備

```powershell
git clone --branch develop https://github.com/gira9317/java-learning-system.git
cd java-learning-system

Copy-Item api/.env.example api/.env
Copy-Item runner/.env.example runner/.env
Copy-Item web/.env.example web/.env

Push-Location api
npm ci
Pop-Location
Push-Location runner
npm ci
Pop-Location
Push-Location web
npm ci
Pop-Location
```

`.env`のコピーは初回だけ行います。既にある場合は設定を保ったまま、`.env.example`との差分を確認してください。macOS/Linuxでは`Copy-Item`を`cp`に置き換え、各フォルダへ`cd`して同じnpmコマンドを実行します。

### 2. DBの準備とAPIの起動（ターミナル1）

Dockerを起動してから実行します。

```powershell
cd api
npm run db:up
npm run db:migrate
```

マイグレーションが完了したら、初期アカウントと講義資料を登録してAPIを起動します。空DBに必要なレッスンは`0004a_initial_lessons.sql`で先に登録されるため、手動の仮登録は不要です。

```powershell
npm run db:seed
npm run content:import
npm run dev
```

APIは`http://localhost:4000`です。`db:seed`はレッスン情報を更新しますが、作成済みアカウントのパスワードや提出は初期化しません。`content:import`は未登録の講義資料だけを取り込みます。

### 3. Java実行サーバー（ターミナル2）

```powershell
cd runner
npm run dev
```

runnerは`http://localhost:5000`です。初回はJDKイメージの取得が終わるまで起動に時間がかかります。`docker`コマンドが使えるターミナルで起動してください。

### 4. 画面（ターミナル3）

```powershell
cd web
npm run dev
```

[http://localhost:3000](http://localhost:3000)を開きます。`predev`でMonaco Editorの配信ファイルが`web/public/monaco/`へコピーされます。

| 社員番号 | 役割 | 初期パスワード |
| --- | --- | --- |
| `T2026001` | 受講者 | `initial-pass` |
| `A0001` | 研修担当者 | `initial-pass` |

初期パスワードは`api/.env`の`SEED_INITIAL_PASSWORD`で変更できます。既存アカウントには反映されません。初回サインイン後はパスワード変更が必要です。

### 2回目以降の起動・停止

- `api/`で`npm run db:up`を実行し、3つのターミナルでそれぞれ`npm run dev`を起動します。
- DB変更を取得したら`npm run db:migrate`、レッスン情報の変更を取得したら`npm run db:seed`を実行します。
- API・runner・webは各ターミナルで`Ctrl+C`。DBは`api/`で`npm run db:down`を実行します。
- 通常の停止ではDBボリュームが残り、アカウント・提出・進捗を維持します。

### 起動確認

```powershell
Invoke-RestMethod http://localhost:4000/health
Invoke-RestMethod http://localhost:5000/health
Invoke-RestMethod http://localhost:3000/api/lessons/catalog
```

順にAPI、runner、画面経由のAPI接続を確認できます。DBの状態は`api/`で`docker compose ps`を確認してください。

## Dockerでまとめて起動する

デモなど、全サービスをまとめて動かす場合は**リポジトリのルート**で実行します。Node.jsのローカルインストールは不要です。

```powershell
docker compose up --build
```

APIは起動時にマイグレーション・seed・講義資料の取り込みを行います。空DBからも自動で初期化します。

起動後は[http://localhost:3000](http://localhost:3000)へアクセスします。初回はイメージのビルドとJDK取得に数分かかります。

```powershell
# 起動状況とログ
docker compose ps
docker compose logs --tail 100 api runner web

# バックグラウンド起動 / 停止
docker compose up -d --build
docker compose down
```

ポートを変更する場合のPowerShellの例です。ComposeがAPIの`WEB_ORIGIN`も合わせます。

```powershell
$env:WEB_PORT = "3100"
docker compose up --build
# http://localhost:3100 を開く
```

このComposeにはソースの監視用マウントがありません。コードや教材ファイルの変更後は対象サービスを再ビルドします。例：`docker compose up -d --build web api`。日常の編集には前述のローカル開発構成を使えます。

**開発用DBとデモ用DBは別です。** `api/compose.yaml`のプロジェクト名は`java-learning`、ルートは`java-learning-demo`です。ローカルの進捗やアカウントが、そのままデモ環境へ移るわけではありません。ローカルwebとデモwebを同時起動する場合はポートを分けてください。

## 環境変数

実際の設定例は[api/.env.example](api/.env.example)、[runner/.env.example](runner/.env.example)、[web/.env.example](web/.env.example)にあります。API・runnerのnpmスクリプトは`.env`を読み込みます。webはNext.jsが読み込みます。

| 場所 | 変数 | ローカルの既定例・用途 |
| --- | --- | --- |
| api | `PORT` | `4000` |
| api | `DATABASE_URL` | `postgresql://app:app@localhost:5432/java_learning` |
| api | `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `api/compose.yaml`のDB設定 |
| api | `POSTGRES_PORT` | ホスト側のDBポート。変更時は`DATABASE_URL`も合わせる |
| api | `WEB_ORIGIN` | `http://localhost:3000`。更新系APIが受け付ける画面のオリジン |
| api | `RUNNER_URL` | `http://localhost:5000` |
| api・runner | `RUNNER_TOKEN` | 両者で同じ値にする。ローカル例は`dev-runner-token` |
| api | `SEED_INITIAL_PASSWORD` | seedで新規作成するアカウントの初期パスワード |
| api | `COOKIE_SECURE` | `true`ならHTTPS用Cookie。本番モードは既定で有効。HTTPのデモでは`false` |
| runner | `PORT` | `5000` |
| runner | `RUNNER_IMAGE` | `eclipse-temurin:21-jdk` |
| runner | `RUNNER_CONCURRENCY` | `4`。Java実行の同時処理数 |
| web | `API_URL` | `http://localhost:4000`。サーバー側のAPI接続と`/api/*`の転送先 |
| ルートCompose | `WEB_PORT` | `3000`。ブラウザからアクセスするポート |

ローカルwebのポートを3100へ変える場合は`npm run dev -- --port 3100`を使い、`api/.env`の`WEB_ORIGIN`を`http://localhost:3100`へ変更してAPIを再起動します。`API_URL`などの設定変更後はwebも再起動してください。

## 画面とカリキュラム

| URL | 内容 |
| --- | --- |
| `/` | 公開の紹介ページ。ログイン済みなら開始ボタンがホーム・管理画面へのリンクに切り替わる |
| `/login` / `/password` | サインイン / 初期パスワード変更 |
| `/home` | 続きから学習するカード、進捗、講義、コード演習の一覧 |
| `/curriculm` | コード演習を4段階に分けた専用一覧。ナビ・フッターの「コード演習」の移動先 |
| `/lectures` / `/lectures/:id` | 講義一覧 / 左に動画・右に資料、小テスト、Option |
| `/lessons/:id` | 演習の教材・提出状況 |
| `/lessons/:id/exercise?question=1` | 演習ワークスペース。問題番号は1〜5 |
| `/admin` | レビュー待ちの一覧 |
| `/admin/submissions/:id` | 提出内容のレビュー・承認・差し戻し |
| `/admin/users` / `/admin/users/:id` | アカウント発行 / 個人の進捗・パスワード再発行 |
| `/admin/lectures` / `/admin/lectures/:id` | 講義一覧 / 動画・資料の編集 |

専用一覧のURLは、現在の実装では**`/curriculm`**です。

| 学習段階 | 表示番号 | 内部Lesson ID | 内容 | 提出方法 |
| --- | --- | --- | --- | --- |
| はじめの一歩 | 01〜05 | 11〜15 | 文字表示、数字と文字、変数、計算、入力 | コードのみ |
| Javaの基本 | 06〜12 | 1〜7 | 基本構造、型、条件分岐、switch、for、while、配列 | フロー図 → コード |
| メソッドとクラス | 13〜14 | 8〜9 | メソッド、クラスとオブジェクト | フロー図 → コード |
| 読みやすさとエラーへの備え | 15 | 16 | 命名、早期リターン、責務・コメント、神クラス、メッセージチェーン | コードのみ |
| 同上 | 16 | 10 | 例外処理 | フロー図 → コード |

表示番号は学習順です。内部IDはURL・教材ファイル・提出記録に使い、並び順を変えても振り直しません。例えば、画面のLesson 15は`/lessons/16`です。

## 教材を編集・追加する

### 講義の本文・動画

講義資料のファイルは`api/content/lectures/章番号-並び順.md`です。例えば`01-07.md`は第1章の7番目の講義です。先頭にはDBの講義名と一致するタイトルを記載します。

```markdown
---
title: DBに登録された講義名
---

## 本文の見出し

講義の説明を記載します。
```

**講義ページはDBの資料を表示します。MDを保存しただけでは既存DBに反映されません。** `api/`で次を使います。

| コマンド | 反映されるもの |
| --- | --- |
| `npm run content:import` | DBで資料が未登録の講義だけ、MDから取り込む |
| `npm run content:import -- --force` | 既存資料もMDで上書きする。管理画面での編集も置き換わる |
| `npm run content:supplements` | 導入・小テスト・Optionを、元JSONからMDとDBへ反映する |

動画URLと資料は管理画面からも編集できます。講義の目次はDBで管理するため、新しい講義を増やす場合はマイグレーションで`lecture_chapters`・`lectures`へ項目を登録し、対応するMDを追加してください。

### 講義の導入・4択小テスト・Option

- `beginner-guides*.json`：導入文、用語・意味・具体例の4組、応用の4択問題を定義します。
- `supplements*.json`：任意のOptionコラムを定義します。
- 小テストは各講義5問。基本の確認4問と、少し応用した1問です。
- 詳しい本文とOptionは折りたたみ、初心者向けの導入から読める表示です。

生成対象のマーカー内をMDで直接修正すると、次の生成で上書きされます。導入・小テスト・OptionはJSONを編集して`npm run content:supplements`を実行してください。この処理はマーカー外の本文を保持し、DB更新前の資料を`api/.tmp/lecture-backups/`へ保存します。

詳しくは[講義教材のREADME](api/content/lectures/README.md)を参照してください。

### コード演習の資料・問題

演習資料は`api/content/lessons/内部IDを2桁にした番号.md`です。例えばID16は`16.md`、ID1は`01.md`です。front matterの`title`はDBのレッスン名と一致させます。

**演習資料はAPIがファイルを直接読みます。DBへの取り込みは不要です。** ローカルでは保存後に教材ページを再読み込みします。DockerではAPIの再ビルドが必要です。

| ファイル | 担当する演習 |
| --- | --- |
| `exercises.json` | 通常10レッスン・50問 |
| `intro-exercises.json` | 入門5レッスン・25問 |
| `readability-exercises.json` | リファクタリング1レッスン・5問 |

JSONのキーは内部Lesson ID、配列の順番が問題番号です。各レッスンは5問で定義します。

```json
{
  "title": "問題の名前",
  "prompt": "仕様・制約・ヒント・レビューで確認する点",
  "starterBody": "        System.out.println(args[0]);",
  "tests": [
    { "args": ["Hello"], "expected": "Hello", "label": "表示の確認" },
    { "args": ["Java"], "expected": "Java", "hidden": true }
  ]
}
```

上は1問の形式例です。`starterBody`は`Main.main`内に入るコードで、省略するとTODOが入ります。複数のメソッドやクラスを含む改善前コードは`starterCode`にJava全文を記載します。両方ある場合は`starterCode`を優先します。

`hidden: true`のテストは受講者向けの問題取得APIには配信せず、採点結果でも入力・期待出力を伏せます。クラス名・構文・読みやすさを自動で判定する仕組みではありません。改善演習では、元コードもテストを通ることを確認し、構造の改善をレビューします。

詳しくは[コード演習教材のREADME](api/content/lessons/README.md)を参照してください。

### 新しいコード演習レッスンを追加する

1. 未使用の内部IDを決め、`api/db/migrations/`に新しいSQLを追加します。タイトル・概要・時間・`sort_order`・`level`を登録します。
2. `api/scripts/seed.ts`にも同じレッスンを追加し、並び順と`level`の割り当てを合わせます。
3. `api/content/lessons/`に教材MDと、5問の演習・テストケースを追加します。JSONファイルを新設する場合は`api/src/lib/exercises.ts`の読み込み対象にも追加します。
4. `web/app/curriculm/page.tsx`の学習段階に内部IDを追加します。
5. `api/scripts/check-exercises.ts`に参照解答・件数・順序の検証を追加します。
6. マイグレーションを適用し、教材表示、問題ごとの保存・提出、レビュー、次のレッスンの解放を確認します。

`level`は`intro`・`core`・`refactor`です。`core`はフロー図の承認が必要で、`intro`と`refactor`はコードのみです。解放順は`sort_order`で決まります。コース途中へ追加する場合は、既存受講者の到達・修了状態をどう引き継ぐかもマイグレーションに記載してください。

## アカウント・データベースの管理

### アカウント発行

管理画面の`/admin/users`、または`api/`のCLIで発行できます。

```powershell
npm run user:create -- T2026002 "山田 花子" "Init-2026" user
npm run user:create -- A0002 "研修 担当" "Init-2026" admin
```

作成したアカウントは初回パスワード変更が必要です。パスワード再発行は管理画面の受講者詳細から行います。

### スキーマ変更とDB接続

```powershell
# api/で実行
npm run db:migrate
npm run db:psql
```

スキーマを変更するときは、`api/db/migrations/`に`0009_変更内容.sql`のような新しいファイルを追加します。既存の適用済みファイルは書き換えません。適用履歴は`schema_migrations`に記録します。

### バックアップ

開発用DBは`api/`、デモ用DBはルートから実行します。以下は既定のDBユーザー・DB名の例です。PowerShellのリダイレクトによる文字コード変換を避けるため、コンテナ内でバックアップファイルを作って取り出します。

```powershell
docker compose exec -T db pg_dump -U app -d java_learning -Fc -f /tmp/java-learning.dump
docker compose cp db:/tmp/java-learning.dump ./java-learning.dump
```

バックアップにはアカウント・提出などが含まれるため、Gitへ追加せず管理してください。`content:supplements`が作る資料のJSONバックアップは、DB全体のバックアップではありません。

### データを初期化するとき

`docker compose down`だけならデータは残ります。**`docker compose down -v`と`npm run db:reset`はDBボリュームを削除し、アカウント・進捗・下書き・提出・管理画面で編集した資料を失います。** 必要な場合だけバックアップ後に実行してください。

`api/`の`npm run db:reset`はDBの再作成、migrate、seed、講義取り込みを順に実行します。

## 動作確認・ビルド

### 型検査とLint

各フォルダで実行します。

| 場所 | コマンド | 内容 |
| --- | --- | --- |
| api | `npm run typecheck` | API・スクリプトの型検査 |
| runner | `npm run typecheck` | Java実行サーバーの型検査 |
| web | `npx tsc --noEmit` | 画面側の型検査 |
| web | `npx eslint app components lib api` | アプリのソースをLint |
| web | `npm run lint` | ESLintの対象全体を検査 |

生成・配信用の`public/monaco/`はLint対象から除外しています。

### 教材と実際のJava実行の検証

`api/`で実行します。いずれもDB・API・runner・webを起動しておくと、一通りの検証を行えます。

```powershell
# 全80問の参照解答・改善前5プログラム・APIの保存/提出/承認
node --env-file-if-exists=.env --import tsx scripts/check-exercises.ts

# クラス → リファクタリング → 例外処理の解放順と教材・演習画面
node --env-file-if-exists=.env --import tsx scripts/check-readability.ts

# 講義MDとDB、導入・4択小テスト・Option、講義ページの表示
npm run content:check

# 空の一時スキーマで、初期化と再実行を確認（既存データは変更しない）
node --env-file-if-exists=.env --import tsx scripts/check-bootstrap.ts
```

Javaの検証は本当にコンテナでコンパイル・実行するため、数分かかります。検証用ユーザーは終了処理で削除します。既存受講者の提出・進捗は変更しません。

`content:check`はローカルに資料バックアップがあれば変更前の資料との比較も行います。バックアップがない新規環境ではその比較だけをスキップし、教材の構造・DBとの一致・表示・本文保持の規則は検証します。`check-bootstrap.ts`はDBへのスキーマ作成権限が必要で、検証した一時スキーマは終了時に削除します。

### ビルド

| 場所 | コマンド | 出力・起動 |
| --- | --- | --- |
| api | `npm run build` | `dist/`へコンパイルし、`npm start`で起動 |
| runner | `npm run build` | `dist/`へコンパイルし、`npm start`で起動 |
| web | `npm run build` | Next.jsをビルドし、`npm start`で起動 |

APIとrunnerはビルド・起動とも各フォルダから実行します。APIの教材読み込みやスクリプトは、実行時のカレントディレクトリを基準にしています。

## 内部構成とAPI

### リクエストの流れ

```text
ブラウザ ─ /api/* ─ webのrewrites ─ API ─ PostgreSQL
Server Component ─ web/api/* ───── API ─ PostgreSQL
                                  │
                                  └─ runner ─ 使い捨てのJDKコンテナ
```

webはDBへ直接接続しません。APIの入口は`api/src/index.ts`、画面からの呼び出しは`web/api/*-api.ts`です。ブラウザからは下表のパスに`/api`を付けます。例：`/api/lessons`。

| メソッドとパス | 権限・用途 | 実装 |
| --- | --- | --- |
| `GET /health` | APIの起動確認 | `api/src/index.ts` |
| `POST /auth/login` | 未認証可・サインイン | `routes/auth.ts` |
| `POST /auth/logout` / `GET /auth/me` / `POST /auth/password` | サインイン済み | 同上 |
| `GET /lessons/catalog` | 未認証可・公開のレッスン一覧 | `routes/lessons.ts` |
| `GET /lessons` / `GET /lessons/:id` | サインイン・パスワード変更済み | 同上 |
| `GET /lessons/:id/submissions` / `POST /lessons/:id/submissions` | 問題ごとの状況取得・提出 | 同上 |
| `PUT /lessons/:id/drafts/:kind` | `flow`・`code`の下書き保存 | 同上 |
| `POST /lessons/:id/run` / `POST /lessons/:id/grade` | Java実行・採点 | 同上 |
| `GET /lectures` / `GET /lectures/:id` | サインイン・パスワード変更済み | `routes/lectures.ts` |
| `PUT /lectures/:id/progress` | 視聴・読了状態の保存 | 同上 |
| `GET /admin/summary` | 研修担当者・レビュー待ち件数 | `routes/admin.ts` |
| `GET /admin/users` / `POST /admin/users` / `GET /admin/users/:id` / `POST /admin/users/:id/reset-password` | 研修担当者・アカウント管理 | 同上 |
| `GET /admin/submissions` / `GET /admin/submissions/:id` / `POST /admin/submissions/:id/approve` / `POST /admin/submissions/:id/reject` | 研修担当者・レビュー | 同上 |
| `GET /admin/lectures` / `GET /admin/lectures/:id` / `PUT /admin/lectures/:id` | 研修担当者・講義の編集 | 同上 |

実装欄の`routes/`は`api/src/routes/`です。演習の提出状況・下書き・実行・採点・提出には`?question=1`〜`5`を指定します。省略時は1です。下書き・提出・レビューは問題ごとに独立しています。

### 認証と進捗

- ランダムなセッショントークンをHttpOnly Cookieの`session`へ保存し、DBにはSHA-256ハッシュを保存します。
- APIの認証ミドルウェアがセッションからユーザーを確定します。受講者IDをクライアントから指定して他人の進捗を操作する構成ではありません。
- 更新系リクエストは画面の`Origin`とJSONのContent-Typeを確認します。
- 初期パスワードのアカウントは`/auth/*`以外の認証必須APIで403になります。
- 主なテーブルは`users`、`sessions`、`lessons`、`lesson_progress`、`submissions`、`drafts`、`lecture_chapters`、`lectures`、`lecture_progress`です。

### Java実行と採点

1. APIがrunnerへ共有トークン付きでコードと入力を送ります。
2. runnerが使い捨てのJDKコンテナを起動します。
3. コンパイルを1回行い、各テスト入力で実行します。
4. APIが標準出力と期待出力を比較し、結果を返します。コード提出時も採点し直します。

Javaコンテナはネットワークなし、メモリ256MB、CPU 1、プロセス数64、読み取り専用ファイルシステムと一時領域、非特権ユーザーで実行します。各実行は5秒、コンパイルは30秒、出力は64KBが上限です。同時処理数は既定4です。

採点用テストの正本は`api/content/lessons/`の3つのJSONです。**旧`exercise_tests`テーブルは現在の採点では使いません。** runnerはDockerコンテナの起動権限を持つため、ブラウザから直接呼ばず、API経由で利用します。デモComposeではrunnerのポートを外部公開しません。

## トラブルシューティング

### 画面は表示されるが「サーバーでエラーが発生しました」になる

ブラウザの表示だけで原因を判断せず、APIのターミナルで元のエラーを確認します。

1. `http://localhost:4000/health`でAPIの起動を確認します。これはDBの正常性の保証ではありません。
2. `api/`で`docker compose ps`を確認し、DBが起動しているか調べます。
3. `DATABASE_URL`、マイグレーションの適用状況、`API_URL`を確認します。
4. `column ... does not exist`なら`npm run db:migrate`を実行します。旧版で`0005`の外部キーエラーになった場合も、最新版へ更新後に再実行してください。

### 演習資料が「準備中」になる・変更が反映されない

- 演習資料：内部Lesson IDに対応するMDと、front matterのタイトルを確認します。タイトル不一致はAPIエラーになります。
- 講義資料：DBへの取り込みが必要です。既存の資料は通常の`content:import`では更新されません。
- 小テスト・Option：JSONを編集した後、`npm run content:supplements`を実行します。
- Docker：ソース変更は自動反映されないため、対象イメージを再ビルドします。

### Javaの実行・採点だけ失敗する

```powershell
docker info
docker image inspect eclipse-temurin:21-jdk
Invoke-RestMethod http://localhost:5000/health
```

runnerのログ、JDKイメージ取得、APIとrunnerの`RUNNER_TOKEN`の一致、APIの`RUNNER_URL`を確認します。コンパイルエラーならJavaコードを、実行環境のエラーならrunnerとDockerを確認してください。

### 更新・提出が403になる

初期パスワードを変更していない場合と、`WEB_ORIGIN`がブラウザのURLと違う場合があります。特にポート変更時や、`localhost`と`127.0.0.1`を混在させた場合は設定を確認してください。

### ポートが使用済み・別環境のデータが表示される

ローカル開発とデモComposeが同時に動いていないか確認します。PowerShellでは次で対象ポートのプロセスを調べられます。

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,4000,5000,5432 |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

接続するweb、`API_URL`、`DATABASE_URL`、Composeの実行フォルダを揃えます。デモDBと開発DBは別のボリュームです。

### Docker DesktopのWSLエラーが続く

WindowsのPowerShellで`wsl --status`、`wsl -l -v`、`docker info`を確認します。Docker Engineが停止している場合は、webを再起動してもDBとJava実行は復旧しません。Docker Desktopの診断ログで、WSL側の起動エラーか、ストレージ・イメージ取得のエラーかを確認してください。再インストールやデータ初期化の前に、DBのバックアップとDockerのデータ保持を確認します。

### ページ遷移・初回表示が遅い

開発中の初回コンパイルや、API・DB・runnerの待ち時間を各ターミナルのログで切り分けます。`npm run dev`は開発用です。画面の評価時は必要に応じて`npm run build`・`npm start`の構成でも確認してください。Monacoの配信ファイルが作成されているかも確認できます。
