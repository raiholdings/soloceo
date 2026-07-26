-- Chốt chặn tầng lưu trữ: không cho phát sinh danh tính OAuth rỗng/vô nghĩa,
-- vì chỉ số duy nhất (oauth_provider, oauth_id) sẽ gộp mọi CEO vào một tài khoản.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_oauth_id_meaningful;
ALTER TABLE users ADD CONSTRAINT users_oauth_id_meaningful CHECK (
  oauth_provider IS NULL
  OR (oauth_id IS NOT NULL
      AND btrim(oauth_id) <> ''
      AND lower(btrim(oauth_id)) NOT IN ('undefined','null','none','nan'))
);
