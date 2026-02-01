-- supabase_user_id カラムを追加（1769300000_add_supabase_user_id と同等）
-- Supabase SQL Editor で実行するか、psql で実行: psql $DATABASE_URL -f add_supabase_user_id_manual.sql

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS supabase_user_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_supabase_user_id ON accounts (supabase_user_id) WHERE supabase_user_id IS NOT NULL;
