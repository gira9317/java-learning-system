-- 応用編の5レッスン（コードのみ・複数ファイル）。「例外処理」（ID 10）の後ろに、この順で置く。
INSERT INTO lessons (id, title, summary, minutes, sort_order, level, multi_file)
SELECT v.id, v.title, v.summary, v.minutes, base.sort_order + v.offset_no, 'advanced', true
FROM (SELECT sort_order FROM lessons WHERE id = 10) base,
     (VALUES
       (17, '継承とインターフェース', '支払い方法・給与・通知など、種類ごとに振る舞いが変わる処理を、継承とインターフェースで組み立てます。', 90, 1),
       (18, 'コレクション（List と Map）', '買い物かご・在庫・集計・予約の重複チェックを、List と Map で実装します。', 90, 2),
       (19, '小さな業務システムを作る', '貸出・会計・勤怠・ToDo・会議室予約を、package に分けたクラスで作ります。', 120, 3),
       (20, '自由制作', '自動販売機やクイズなど、正解が1つではない課題を、自分で設計して作ります。', 180, 4),
       (21, 'オセロを作る', '盤面の表示から裏返しのルール、コンピュータとの対戦、画面の盤での対戦まで、少しずつ作ります。', 180, 5)
     ) AS v(id, title, summary, minutes, offset_no)
ON CONFLICT (id) DO NOTHING;

-- 例外処理まで終えた人には、応用編の最初のレッスンを開く
INSERT INTO lesson_progress (user_id, lesson_id, status)
SELECT p.user_id, 17, 'in-progress'
FROM lesson_progress p
WHERE p.lesson_id = 10 AND p.status = 'completed'
ON CONFLICT (user_id, lesson_id) DO NOTHING;
