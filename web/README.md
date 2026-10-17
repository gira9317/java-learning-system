# Java Training — 画面

Next.js / React / TypeScript / Tailwind CSSで作る学習画面です。DBへは直接接続せず、Hono APIを経由します。システム全体のセットアップは[ルートのREADME](../README.md)を参照してください。

## ローカルで起動する

API・DB・runnerの準備後、`web/`で実行します。Node.jsはDockerfileと同じ24系に揃えられます。

```powershell
# 初回だけ。.envが既にある場合は上書きしない。
Copy-Item .env.example .env
npm ci

npm run dev
```

[http://localhost:3000](http://localhost:3000)を開きます。`API_URL`は既定で`http://localhost:4000`です。設定を変更した場合はwebを再起動してください。

`predev`・`prebuild`がMonaco Editorのファイルを`public/monaco/`へコピーします。演習エディタは外部CDNではなく、このファイルを使います。

## 主な画面

| URL | 画面 |
| --- | --- |
| `/` | 紹介ページ。ヘッダー・開始ボタン・フッターはログイン状態に応じて表示を切り替える |
| `/home` | 受講者のホーム、進捗、講義・演習一覧 |
| `/curriculm` | コード演習の専用一覧。4段階に整理 |
| `/lectures` / `/lectures/:id` | 講義一覧 / 動画・資料・4択小テスト |
| `/lessons/:id` | コード演習の教材 |
| `/lessons/:id/exercise?question=1` | 問題別の演習。問題番号は1〜5 |
| `/admin` | レビュー待ち一覧 |
| `/admin/users` / `/admin/lectures` | アカウント・講義の管理 |

専用一覧は現在`/curriculm`という綴りです。内部Lesson IDと画面の番号は異なるため、URLは`lesson.id`、表示は`lesson.number`を使います。

## 実装の入口

- `app/`：ページ。認証が必要な画面は`lib/session.ts`の`requireLearner`・`requireAdmin`などを使います。
- `api/`：APIを呼ぶ関数。ブラウザからは`/api/*`、Server Componentからは`API_URL`のAPIへ接続します。
- `components/global-nav.tsx`：サーバーでログイン状態を取得し、操作部分を`global-nav-client.tsx`へ渡します。
- `components/session-link.tsx`：公開ページのログイン状態に応じたリンク。確認中に未ログイン表示を出さないようSuspenseを使います。
- `components/lecture/`：Markdown、講義資料の分割、4択の解答確認。
- `components/workspace/`：問題文、Monaco、フロー図、保存・提出のUI。
- `app/globals.css`：デザイントークン、共通タイポグラフィ、ボタン。

教材本文や演習問題は`api/content/`で管理します。編集方法は[講義教材](../api/content/lectures/README.md)・[演習教材](../api/content/lessons/README.md)を参照してください。

## 確認とビルド

```powershell
npx tsc --noEmit
npx eslint app components lib api
npm run build
npm start
```

`npm run lint`で全体を確認できます。生成・配信用`public/monaco/`はLint対象から除外しています。

通常の`npm run build`はNext.jsのビルドです。Dockerfileでは`NEXT_OUTPUT=standalone`を指定してstandalone出力を使います。画面ポートの変更時は、APIの`WEB_ORIGIN`も合わせてください。
