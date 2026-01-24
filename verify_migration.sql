-- oauth_statesテーブルの確認用SQL
-- Supabase SQL Editorで実行してください

-- 1. テーブルの存在確認
SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'oauth_states'
ORDER BY ordinal_position;

-- 2. インデックスの確認
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'oauth_states';

-- 3. テーブル構造の確認（簡易版）
SELECT * FROM oauth_states LIMIT 1;

-- 4. マイグレーション履歴の確認
SELECT * FROM pgmigrations 
WHERE name LIKE '%oauth_states%'
ORDER BY run_on DESC;
