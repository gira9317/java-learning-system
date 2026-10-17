ALTER TABLE submissions ADD COLUMN review_read_at timestamptz;
-- 導入前のレビューを一斉に未読にしない。履歴としては閲覧できる。
UPDATE submissions SET review_read_at = COALESCE(reviewed_at,now()) WHERE status IN ('approved','rejected');
CREATE INDEX submissions_review_notifications_idx ON submissions(user_id,reviewed_at DESC,id)
WHERE status IN ('approved','rejected') AND reviewed_at IS NOT NULL;
