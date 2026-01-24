-- oauth_states テーブルを作成するSQL
-- SupabaseのSQL Editorで実行してください

-- テーブルが既に存在する場合は削除（オプション）
DROP TABLE IF EXISTS oauth_states CASCADE;

-- oauth_states テーブルを作成
CREATE TABLE oauth_states (
  state VARCHAR(64) PRIMARY KEY NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  add_account_mode BOOLEAN DEFAULT FALSE,
  original_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE
);

-- 期限切れのstateを自動削除するためのインデックス
CREATE INDEX idx_oauth_states_expires_at ON oauth_states(expires_at);

-- 確認用クエリ
SELECT * FROM oauth_states LIMIT 1;
