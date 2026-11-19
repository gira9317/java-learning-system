-- 複数ファイル（フォルダ = package）でコードを書けるレッスン。
-- 「クラスとオブジェクト」以降は、クラスをファイルに分けて書けるようにする。
ALTER TABLE lessons ADD COLUMN multi_file boolean NOT NULL DEFAULT false;
UPDATE lessons SET multi_file = true WHERE id IN (9, 10, 16);

-- 応用編（コードのみ・複数ファイル）。継承・コレクション・業務システム・自由制作・オセロのレッスンで使う
ALTER TABLE lessons DROP CONSTRAINT lessons_level_check;
ALTER TABLE lessons ADD CONSTRAINT lessons_level_check CHECK (level IN ('intro','core','refactor','advanced'));
