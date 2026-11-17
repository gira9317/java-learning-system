-- 講義の解説動画 URL（YouTube「かじぷろさーびす」チャンネル）
-- npm run db:seed で流す。何度流してもよい。管理画面で登録・変更した URL は上書きしない（未登録の講義にだけ入れる）
-- 講義は（章番号, 並び順）で特定する。content/lectures/章番号-並び順.md と同じ番号

UPDATE lectures AS l
SET video_url = v.video_url, updated_at = now()
FROM (VALUES
  (1, 1, 'https://youtu.be/Czq2V-Ne-Rc'), -- 01-01 ハードウェア
  (1, 2, 'https://youtu.be/OyHorya4Rfg'), -- 01-02 ソフトウェア
  (1, 3, 'https://youtu.be/9UP1yygJtOo'), -- 01-03 DOSコマンド・バッチ処理
  (1, 4, 'https://youtu.be/9biA0t6Nvyw'), -- 01-04 基数と基数変換
  (1, 5, 'https://youtu.be/PTagD07Xsqg'), -- 01-05 データ量の単位
  (1, 6, 'https://youtu.be/Zbe3FFT06X0'), -- 01-06 データ型と変数の型
  (1, 7, 'https://youtu.be/zUcqb2TqblY'), -- 01-07 算術演算
  (1, 8, 'https://youtu.be/CVwaPZkJvvs'), -- 01-08 比較式
  (1, 9, 'https://youtu.be/6MTmdisMuDs'), -- 01-09 論理演算
  (1, 10, 'https://youtu.be/klcWMY4pLCQ'), -- 01-10 ビット演算
  (1, 11, 'https://youtu.be/jFxrkrby8TE'), -- 01-11 順次処理
  (1, 12, 'https://youtu.be/Gbwcysi80vM'), -- 01-12 分岐処理
  (1, 13, 'https://youtu.be/Zqc8dr63XMY'), -- 01-13 AND / OR
  (1, 14, 'https://youtu.be/BXqIebPe8dY'), -- 01-14 反復処理
  (1, 15, 'https://youtu.be/ZycKwGVdLMM'), -- 01-15 アルゴリズム
  (1, 16, 'https://youtu.be/5mlFoHmqkfY'), -- 01-16 スタックとキュー
  (1, 17, 'https://youtu.be/TkiFdrqNKAc'), -- 01-17 アナログとデジタル
  (1, 18, 'https://youtu.be/qiFYpYD9ZWY'), -- 01-18 ストリーム・ファイルI/O
  (1, 19, 'https://youtu.be/ESNLtEwbBGo'), -- 01-19 エンコード・デコード
  (1, 20, 'https://youtu.be/8rEGXCJH0Rc'), -- 01-20 文字コード
  (1, 21, 'https://youtu.be/QvLfDaiPrJw'), -- 01-21 暗号化・復号
  (1, 22, 'https://youtu.be/R3gOoi4H6xg'), -- 01-22 ハッシュ値・チェックサム
  (1, 23, 'https://youtu.be/kl84H9Krwfs'), -- 01-23 環境構築
  (1, 24, 'https://youtu.be/yspBHsCnbHs'), -- 01-24 プログラミング言語
  (1, 25, 'https://youtu.be/QRAcf-QSnY8'), -- 01-25 プリミティブ型と参照型
  (1, 26, 'https://youtu.be/5tbN8LVoY8Q'), -- 01-26 メモリ領域
  (1, 27, 'https://youtu.be/eD6vAu-36GA'), -- 01-27 コンパイラーとインタープリター
  (1, 28, 'https://youtu.be/ZkX6ssVHt6o'), -- 01-28 Java基本・メソッド・オブジェクト指向・ラムダ式・Stream API・例外・
  (1, 29, 'https://youtu.be/S_oK8kktgnM'), -- 01-29 C言語基礎
  (1, 30, 'https://youtu.be/XoRWjd9FRwM'), -- 01-30 Python基礎
  (1, 31, 'https://youtu.be/lmA4LN3gnEs'), -- 01-31 JavaScript基礎
  (1, 32, 'https://youtu.be/QEyV3g5H-4U'), -- 01-32 XML / HTML / JSON / PDF / CSS
  (1, 33, 'https://youtu.be/sZzqytoSuUo'), -- 01-33 開発手法と開発工程
  (1, 34, 'https://youtu.be/vqYd-bCMVjs'), -- 01-34 機能分割
  (1, 35, 'https://youtu.be/qIwT_WpDjZ0'), -- 01-35 UML
  (1, 36, 'https://youtu.be/T-viRp7MCqY'), -- 01-36 デザインパターン
  (1, 37, 'https://youtu.be/OYQyiaPbLr8'), -- 01-37 可読性・命名規則
  (1, 38, 'https://youtu.be/O_7u0HcgsxE'), -- 01-38 テストの種類
  (1, 39, 'https://youtu.be/RzXAFQoQgIo'), -- 01-39 トレース
  (1, 40, 'https://youtu.be/0OJLm0ZQUo0'), -- 01-40 テスト仕様書
  (1, 41, 'https://youtu.be/qXTCA3odWbI'), -- 01-41 FindBugs / SpotBugs
  (1, 42, 'https://youtu.be/zfahK3h6pkI'), -- 01-42 JUnit
  (2, 1, 'https://youtu.be/cEd7Lf_XCoU'), -- 02-01 OSI参照モデル
  (2, 2, 'https://youtu.be/nyGN7d6Oy8w'), -- 02-02 TCP/IP、ポート
  (2, 3, 'https://youtu.be/kFFRlQYdDYs'), -- 02-03 ルーティング
  (2, 4, 'https://youtu.be/893qeQJkjk4'), -- 02-04 アクセスコントロール
  (2, 5, 'https://youtu.be/py1vbSVRsO8'), -- 02-05 ネットワーク機器
  (2, 6, 'https://youtu.be/65OZ_bHFIn0'), -- 02-06 DNS
  (2, 7, 'https://youtu.be/9ECRa0gu8Qc'), -- 02-07 パケットキャプチャ
  (3, 1, 'https://youtu.be/OzQiJoKTAUM'), -- 03-01 HTTP
  (3, 2, 'https://youtu.be/uOLP8-yHgMs'), -- 03-02 GET / POST
  (3, 3, 'https://youtu.be/xPuIEWTeAL8'), -- 03-03 REST
  (3, 4, 'https://youtu.be/tJx9ZLeFGyE'), -- 03-04 セッション・Cookie
  (3, 5, 'https://youtu.be/zmxxz2_BZoQ'), -- 03-05 SMTP / POP
  (3, 6, 'https://youtu.be/0WiW41Rl1_0'), -- 03-06 MIMEマルチパート
  (3, 7, 'https://youtu.be/PO3cH56xMjY'), -- 03-07 FTP
  (3, 8, 'https://youtu.be/RTWHw-SkY5w'), -- 03-08 NFS / SMB
  (4, 1, 'https://youtu.be/1TGzfwda-ug'), -- 04-01 RDB
  (4, 2, 'https://youtu.be/MEuA1Kx_nFU'), -- 04-02 SQL基本
  (4, 3, 'https://youtu.be/yHFvgtCAc58'), -- 04-03 JOIN
  (4, 4, 'https://youtu.be/Es_tGaTSShk'), -- 04-04 副問い合わせ
  (4, 5, 'https://youtu.be/BuGz2bt3fXg'), -- 04-05 NoSQL
  (5, 1, 'https://youtu.be/1D05-5HTzh4'), -- 05-01 証明書
  (5, 2, 'https://youtu.be/4afbuaMTc3I'), -- 05-02 セキュアレイヤー
  (5, 3, 'https://youtu.be/AATOS_YSf9A'), -- 05-03 認証
  (5, 4, 'https://youtu.be/z8hCRjXg0rY'), -- 05-04 JavaScriptインジェクション
  (5, 5, 'https://youtu.be/V0CYBXna7KU'), -- 05-05 SQLインジェクション
  (5, 6, 'https://youtu.be/kZOMKZi8eGY'), -- 05-06 ブルートフォース攻撃・辞書攻撃
  (5, 7, 'https://youtu.be/LtCPaVAR310') -- 05-07 なりすましメール
) AS v(chapter_id, sort_order, video_url)
WHERE l.chapter_id = v.chapter_id AND l.sort_order = v.sort_order AND l.video_url IS NULL;
