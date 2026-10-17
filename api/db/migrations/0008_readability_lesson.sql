ALTER TABLE lessons DROP CONSTRAINT lessons_level_check;
ALTER TABLE lessons ADD CONSTRAINT lessons_level_check CHECK (level IN ('intro','core','refactor'));

-- 既存IDを保持し、クラスとオブジェクトの直後へ挿入する。
UPDATE lessons SET sort_order = sort_order + 1
WHERE sort_order > (SELECT sort_order FROM lessons WHERE id = 9);
INSERT INTO lessons(id,title,summary,minutes,sort_order,level)
SELECT 16,'読みやすいコードと責務の分け方',
  '命名・早期リターン・責務分割・コメント・オブジェクトへの頼み方を、動くコードの改善で学びます。',90,sort_order+1,'refactor'
FROM lessons WHERE id=9;

-- 到達済みの人には新しい演習を開く。全修了の閲覧用アカウントは修了状態を保つ。
INSERT INTO lesson_progress(user_id,lesson_id,status)
SELECT p.user_id,16,CASE WHEN EXISTS (
  SELECT 1 FROM lesson_progress e WHERE e.user_id=p.user_id AND e.lesson_id=10 AND e.status='completed'
) THEN 'completed' ELSE 'in-progress' END
FROM lesson_progress p WHERE p.lesson_id=9 AND p.status='completed';
