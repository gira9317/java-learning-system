# 講義資料と小テスト

`章番号-並び順.md`が講義資料です。各資料の末尾に、5問の小テストと任意のOptionコラムを収録します。
全講義に、プログラミング未経験者向けの導入と身近な具体例を追加しています。
1〜4問は用語と具体例の基本確認、5問目は少し応用した4択問題です。選択後の「答え合わせ」で正誤と解説を表示し、何度でも選び直せます。
従来の詳しい本文は折りたたんで保持し、Optionは任意の発展資料として分けます。
小テストの解答確認は、講義の視聴・読了状態とは連動しません。

`beginner-guides*.json`は「導入文、用語・意味・例の4組、応用4択」の順で管理します。
正解位置は講義・問題ごとに安定した順で並べ替え、毎回同じ選択肢を正解にしません。
Optionは`supplements*.json`で管理します。編集後、APIフォルダで次を実行するとMDとDBを更新できます。

```powershell
npm run content:supplements
```

講義本文は保持し、専用マーカー内の導入・小テスト・Optionを更新します。
マーカー外の管理画面での追記も保持します。DB更新前の資料は`.tmp/lecture-backups/`へ退避します。
MD末尾のマーカー内を直接編集した場合、次の生成で上書きされるため、補足の編集はJSON側で行ってください。

新しいDBでは通常の`npm run content:import`で、補足を含むMD全体を取り込めます。
既存の資料へ補足だけ追加するときに`--force`による全文上書きを使う必要はありません。

## 参考資料

- [MDN：Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
- [PostgreSQL：JOINと表式](https://www.postgresql.org/docs/17/queries-table-expressions.html)
- [OWASP：XSS対策](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet)
- [OWASP：SQLインジェクション対策](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet)
- [OWASP：認証](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP：多要素認証](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [MDN：TLS](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Transport_Layer_Security)
- [RFC 7489：DMARC](https://www.rfc-editor.org/info/rfc7489/)
