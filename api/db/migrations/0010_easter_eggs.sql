-- イースターエッグ（CTF 風の隠し要素）をクリアした記録。1 人がバッジごとに 1 行
CREATE TABLE easter_eggs (
  user_id   uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  egg       text        NOT NULL CHECK (egg IN ('duke', 'tux', 'gopher')),
  solved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, egg)
);
