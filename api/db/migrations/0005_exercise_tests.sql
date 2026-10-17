-- コード演習の採点に使うテストケース。採点は実行サーバーで本当に動かして、標準出力を比べる
-- hidden のテストケースは、受講者には入力と期待する出力を見せない（結果の合否だけ出す）
CREATE TABLE exercise_tests (
  id              serial  PRIMARY KEY,
  lesson_id       integer NOT NULL REFERENCES lessons(id),
  sort_order      integer NOT NULL,
  label           text,                         -- 例: 「境界値」
  args            text[]  NOT NULL DEFAULT '{}', -- コマンドライン引数
  stdin           text    NOT NULL DEFAULT '',   -- 標準入力
  expected_stdout text    NOT NULL,              -- 期待する出力（前後の空白・改行の違いは無視して比べる）
  hidden          boolean NOT NULL DEFAULT false,
  UNIQUE (lesson_id, sort_order)
);

-- Lesson 03（条件分岐）: 60 点以上なら「合格」、未満なら「不合格」
INSERT INTO exercise_tests (lesson_id, sort_order, label, args, expected_stdout, hidden) VALUES
  (3, 1, NULL,     ARRAY['80'],  '合格',   false),
  (3, 2, '境界値', ARRAY['60'],  '合格',   false),
  (3, 3, NULL,     ARRAY['59'],  '不合格', false),
  (3, 4, '境界値', ARRAY['0'],   '不合格', true),
  (3, 5, '境界値', ARRAY['100'], '合格',   true);
