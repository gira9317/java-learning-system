-- 提出前の作業途中の内容（下書き）。画面を離れても消えないよう、自動で保存する
-- 1 人・1 レッスン・種類（フロー図 / コード）ごとに 1 件。提出したら消す
CREATE TABLE drafts (
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id  integer     NOT NULL REFERENCES lessons(id),
  kind       text        NOT NULL CHECK (kind IN ('flow', 'code')),
  content    jsonb       NOT NULL, -- 提出（submissions.content）と同じ形
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id, kind)
);
