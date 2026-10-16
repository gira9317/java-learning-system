-- ユーザー（研修担当者が発行する。自己登録はない）
CREATE TABLE users (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_no          text        NOT NULL UNIQUE, -- 社員番号（大文字に揃えて保存）
  name                 text        NOT NULL,
  role                 text        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  password_hash        text        NOT NULL,        -- argon2id
  must_change_password boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- サインイン中のセッション。クッキーにはトークンを、DB にはその SHA-256 を保存する
CREATE TABLE sessions (
  id         text        PRIMARY KEY, -- sha256(token) の 16 進
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE TABLE lessons (
  id         integer PRIMARY KEY,
  title      text    NOT NULL,
  summary    text    NOT NULL,
  minutes    integer NOT NULL,
  sort_order integer NOT NULL
);

-- 行がないレッスンは未解放（locked）として扱う
CREATE TABLE lesson_progress (
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id  integer     NOT NULL REFERENCES lessons(id),
  status     text        NOT NULL CHECK (status IN ('completed', 'in-progress', 'locked')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
