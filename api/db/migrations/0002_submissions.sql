-- 受講者の提出（フロー図・コード）と、研修担当者のレビュー結果
-- 1 レッスンの流れ: フロー図を提出 → 承認 → コードを提出 → 承認 → レッスン完了・次を解放
CREATE TABLE submissions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id      integer     NOT NULL REFERENCES lessons(id),
  kind           text        NOT NULL CHECK (kind IN ('flow', 'code')),
  content        jsonb       NOT NULL, -- flow: { nodes, edges } / code: { code }
  auto_results   jsonb,                -- ブラウザでの自動採点の結果（参考。受講者の手元で変えられるため判定には使わない）
  status         text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_comment text,
  reviewed_by    uuid        REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  -- 差し戻しにはコメントを必須にする
  CHECK (status <> 'rejected' OR review_comment IS NOT NULL)
);

CREATE INDEX submissions_user_lesson_idx ON submissions (user_id, lesson_id, kind, created_at DESC);
CREATE INDEX submissions_pending_idx ON submissions (created_at) WHERE status = 'pending';

-- 同じレッスン・同じ種類で、レビュー待ちは 1 件まで（レビュー中に中身が変わらないように）
CREATE UNIQUE INDEX submissions_one_pending_idx ON submissions (user_id, lesson_id, kind) WHERE status = 'pending';
