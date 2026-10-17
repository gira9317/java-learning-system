# 講義資料と小テスト

`章番号-並び順.md`が講義資料です。各資料の末尾に、5問の小テストと任意のOptionコラムを収録します。
全講義に、プログラミング未経験者向けの導入と身近な具体例を追加しています。
1〜4問は用語と具体例の基本確認、5問目は少し応用した4択問題です。選択後の「答え合わせ」で正誤と解説を表示し、何度でも選び直せます。
従来の詳しい本文は折りたたんで保持し、Optionは任意の発展資料として分けます。
小テストの解答確認は、講義の視聴・読了状態とは連動しません。

## MDを直接編集する

**講義の管理対象はMDだけです。** 導入・本文・小テスト・Optionを1つのファイルに書きます。JSONからの生成処理はありません。

ファイル名は`章番号-章内の並び順.md`です。先頭のfront matterの`title`はDBに登録した講義名と一致させます。

編集した資料を反映するときは`api/`で実行します。

```powershell
npm run content:import -- --force
npm run content:check
```

講義ページはDBの資料を読むため、MDの保存だけでは反映されません。`--force`は既存のDB資料もMD全文で上書きします。管理画面だけに残っている追記は先にMDへ移してください。動画URLや受講者の視聴・読了状態はこのコマンドでは変更しません。

初回のDB登録では`npm run content:import`を使います。これは資料が未登録の講義だけを取り込みます。Dockerでも同じMDを使いますが、変更後はAPIの再ビルドが必要です。

## 導入・小テスト・Optionの書式

マーカーは生成用ではなく、画面で表示領域を分けるための目印です。マーカー内も直接編集できます。既存のMDをコピーすると、全5問を含む書式を保ちやすくなります。

初心者向けの導入を次のマーカーで囲みます。その後に通常の詳しい本文を記載します。

```markdown
<!-- lecture-intro:start -->

## まずはここから

身近な具体例から説明します。

<!-- lecture-intro:end -->

## 詳しい説明

本文・コード例を記載します。
```

小テストは`<!-- lecture-supplement:start -->`と`<!-- lecture-supplement:end -->`の間に、問1〜問5、Optionの順で書きます。以下は1問分の書式例です。実際の資料には問1〜問4と`### 問5【応用】`を用意します。

```markdown
### 問1

作業中の情報を一時的に置く場所はどれですか。

#### 選択肢

- A. CPU
- B. メモリ（RAM）
- C. SSD
- D. キーボード

#### 解答・解説

正解: B

メモリは作業中の情報を一時的に置く場所です。
```

5問の後に発展資料を記載し、終了マーカーで閉じます。

```markdown
## Option：さらに学びたい人へ

少し発展した説明や、試してみる課題を書きます。

<!-- lecture-supplement:end -->
```

- 問番号は1〜5を順に並べます。5問目に`【応用】`を付けます。
- 選択肢は`- A. ...`〜`- D. ...`を各1行で書き、同じ内容を重複させません。
- 正解は半角のコロンを使い、`正解: B`の形式で記載します。その後に空行と解説を置きます。
- Option見出しは全角コロンの`## Option：タイトル`です。発展資料の学習は任意です。
- 正解位置は自動で並び替えません。選択肢を動かすときは正解の記号も更新してください。

`content:check`はMDとDBの全文一致、タイトル、導入、5問の4択・正解・解説、Option、先頭と末尾の講義ページ表示を確認します。書式が崩れると小テストUIではなく通常のMarkdownとして表示されるため、編集後に確認してください。

## 参考資料

- [MDN：Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
- [PostgreSQL：JOINと表式](https://www.postgresql.org/docs/17/queries-table-expressions.html)
- [OWASP：XSS対策](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet)
- [OWASP：SQLインジェクション対策](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet)
- [OWASP：認証](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP：多要素認証](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [MDN：TLS](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Transport_Layer_Security)
- [RFC 7489：DMARC](https://www.rfc-editor.org/info/rfc7489/)
