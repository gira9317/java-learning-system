ALTER TABLE lessons ADD COLUMN level text NOT NULL DEFAULT 'core' CHECK (level IN ('intro','core'));
-- IDを変えずに、既存の10レッスンの前へ入門編を置く。
UPDATE lessons SET sort_order = sort_order + 5;
INSERT INTO lessons(id,title,summary,minutes,sort_order,level) VALUES
  (11,'はじめての実行と文字の表示','用意されたコードを動かし、表示する文字を1か所ずつ変えてみます。',15,1,'intro'),
  (12,'数字と文字を区別しよう','数字の計算と、文字をそのまま表示する違いを試します。',15,2,'intro'),
  (13,'変数に値を入れてみよう','名前の付いた箱をイメージし、数や文字を覚えて表示します。',20,3,'intro'),
  (14,'足し算から始める計算','足し算・引き算・掛け算・割り算・余りを1つずつ試します。',20,4,'intro'),
  (15,'入力を受け取ってみよう','用意された読み込みの行を使い、入力を変えて同じコードを動かします。',20,5,'intro');

-- 旧コースを全て修了した人は閲覧可能な状態を保つ。
INSERT INTO lesson_progress(user_id,lesson_id,status)
SELECT u.id,l.id,'completed' FROM users u CROSS JOIN lessons l
WHERE l.level='intro' AND u.role='user'
AND (SELECT count(*) FROM lesson_progress p WHERE p.user_id=u.id AND p.lesson_id BETWEEN 1 AND 10 AND p.status='completed')=10;

-- 既存受講者にも入口を用意する。既に修了扱いの進捗は変更しない。
INSERT INTO lesson_progress(user_id,lesson_id,status)
SELECT id,11,'in-progress' FROM users WHERE role='user'
ON CONFLICT (user_id,lesson_id) DO NOTHING;
