-- 既存の下書き・提出は第1問として保持する。
ALTER TABLE drafts ADD COLUMN question_no integer NOT NULL DEFAULT 1 CHECK (question_no BETWEEN 1 AND 5);
ALTER TABLE drafts DROP CONSTRAINT drafts_pkey;
ALTER TABLE drafts ADD PRIMARY KEY (user_id, lesson_id, question_no, kind);
ALTER TABLE submissions ADD COLUMN question_no integer NOT NULL DEFAULT 1 CHECK (question_no BETWEEN 1 AND 5);
DROP INDEX submissions_one_pending_idx;
CREATE UNIQUE INDEX submissions_one_pending_idx ON submissions (user_id, lesson_id, question_no, kind) WHERE status = 'pending';
CREATE INDEX submissions_question_idx ON submissions (user_id, lesson_id, question_no, kind, created_at DESC);
