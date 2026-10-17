-- 講義（解説動画 + 資料）。コード演習（lessons）とは別の、読み物の教材
-- 目次は紙の教材に合わせて最初に登録し、動画と資料は研修担当者が管理画面から後で登録する

CREATE TABLE lecture_chapters (
  id         integer PRIMARY KEY, -- 章番号
  title      text    NOT NULL,
  page_start integer,             -- 紙の教材のページ
  page_end   integer
);

CREATE TABLE lectures (
  id           serial      PRIMARY KEY,
  chapter_id   integer     NOT NULL REFERENCES lecture_chapters(id),
  section      text,                 -- 節（例: 演算）。節のない章は NULL
  title        text        NOT NULL, -- 項目（例: 算術演算）
  sort_order   integer     NOT NULL, -- 章の中での並び順
  video_url    text,                 -- 解説動画の URL（未登録なら NULL）
  material_md  text,                 -- 資料（Markdown。未登録なら NULL）
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, sort_order)
);

-- 受講者が自分で付ける「視聴・読了済み」
CREATE TABLE lecture_progress (
  user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lecture_id   integer     NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lecture_id)
);

INSERT INTO lecture_chapters (id, title, page_start, page_end) VALUES
  (1, 'ベーシックスキル', 2, 102),
  (2, 'ネットワーク概論', 103, 110),
  (3, 'レガシーテクノロジー', 111, 120),
  (4, 'データベース', 121, 129),
  (5, 'セキュリティ', 130, 134);

INSERT INTO lectures (chapter_id, section, title, sort_order)
SELECT chapter_id, section, title, row_number() OVER (PARTITION BY chapter_id ORDER BY ord)
FROM (VALUES
  -- 第1章 ベーシックスキル
  (1, 1, 'コンピューター概論', 'ハードウェア'),
  (1, 2, 'コンピューター概論', 'ソフトウェア'),
  (1, 3, 'コンピューター概論', 'DOSコマンド・バッチ処理'),
  (1, 4, 'コンピューター概論', '基数と基数変換'),
  (1, 5, 'コンピューター概論', 'データ量の単位'),
  (1, 6, 'コンピューター概論', 'データ型と変数の型'),
  (1, 7, '演算', '算術演算'),
  (1, 8, '演算', '比較式'),
  (1, 9, '演算', '論理演算'),
  (1, 10, '演算', 'ビット演算'),
  (1, 11, 'ロジック基礎', '順次処理'),
  (1, 12, 'ロジック基礎', '分岐処理'),
  (1, 13, 'ロジック基礎', 'AND / OR'),
  (1, 14, 'ロジック基礎', '反復処理'),
  (1, 15, 'ロジック基礎', 'アルゴリズム'),
  (1, 16, 'データ構造', 'スタックとキュー'),
  (1, 17, 'バイナリデータ', 'アナログとデジタル'),
  (1, 18, 'バイナリデータ', 'ストリーム・ファイルI/O'),
  (1, 19, 'バイナリデータ', 'エンコード・デコード'),
  (1, 20, 'バイナリデータ', '文字コード'),
  (1, 21, 'バイナリデータ', '暗号化・復号'),
  (1, 22, 'バイナリデータ', 'ハッシュ値・チェックサム'),
  (1, 23, '言語', '環境構築'),
  (1, 24, '言語', 'プログラミング言語'),
  (1, 25, '言語', 'プリミティブ型と参照型'),
  (1, 26, '言語', 'メモリ領域'),
  (1, 27, '言語', 'コンパイラーとインタープリター'),
  (1, 28, '言語', 'Java基本・メソッド・オブジェクト指向・ラムダ式・Stream API・例外・スレッド・サーブレット等'),
  (1, 29, '言語', 'C言語基礎'),
  (1, 30, '言語', 'Python基礎'),
  (1, 31, '言語', 'JavaScript基礎'),
  (1, 32, 'データ記述言語', 'XML / HTML / JSON / PDF / CSS'),
  (1, 33, NULL, '開発手法と開発工程'), -- 目次で下位項目のない節は、節なしの項目にする
  (1, 34, '設計', '機能分割'),
  (1, 35, '設計', 'UML'),
  (1, 36, '設計', 'デザインパターン'),
  (1, 37, '設計', '可読性・命名規則'),
  (1, 38, 'テスト手法', 'テストの種類'),
  (1, 39, 'テスト手法', 'トレース'),
  (1, 40, 'テスト手法', 'テスト仕様書'),
  (1, 41, 'テスト手法', 'FindBugs / SpotBugs'),
  (1, 42, 'テスト手法', 'JUnit'),
  -- 第2章 ネットワーク概論
  (2, 1, NULL, 'OSI参照モデル'),
  (2, 2, NULL, 'TCP/IP、ポート'),
  (2, 3, NULL, 'ルーティング'),
  (2, 4, NULL, 'アクセスコントロール'),
  (2, 5, NULL, 'ネットワーク機器'),
  (2, 6, NULL, 'DNS'),
  (2, 7, NULL, 'パケットキャプチャ'),
  -- 第3章 レガシーテクノロジー
  (3, 1, NULL, 'HTTP'),
  (3, 2, NULL, 'GET / POST'),
  (3, 3, NULL, 'REST'),
  (3, 4, NULL, 'セッション・Cookie'),
  (3, 5, NULL, 'SMTP / POP'),
  (3, 6, NULL, 'MIMEマルチパート'),
  (3, 7, NULL, 'FTP'),
  (3, 8, NULL, 'NFS / SMB'),
  -- 第4章 データベース
  (4, 1, NULL, 'RDB'),
  (4, 2, NULL, 'SQL基本'),
  (4, 3, NULL, 'JOIN'),
  (4, 4, NULL, '副問い合わせ'),
  (4, 5, NULL, 'NoSQL'),
  -- 第5章 セキュリティ
  (5, 1, NULL, '証明書'),
  (5, 2, NULL, 'セキュアレイヤー'),
  (5, 3, NULL, '認証'),
  (5, 4, NULL, 'JavaScriptインジェクション'),
  (5, 5, NULL, 'SQLインジェクション'),
  (5, 6, NULL, 'ブルートフォース攻撃・辞書攻撃'),
  (5, 7, NULL, 'なりすましメール')
) AS t(chapter_id, ord, section, title);
