# 🗄️ RedisとPostgreSQLの違いと設定ガイド

## 📋 重要なポイント

### Redis（Upstash）とPostgreSQL（Supabase）は**両方必要**

- **Redis（Upstash）**: セッションストア、ジョブキュー用
- **PostgreSQL（Supabase）**: メインデータベース（ユーザー、カレンダー、イベントなど）

## 🔍 それぞれの役割

### Redis（Upstash）の役割

1. **セッションストア**: ユーザーのログイン状態を保存
2. **ジョブキュー**: バックグラウンドジョブ（同期処理など）を管理

**特徴**:
- ✅ スキーマレス（テーブル定義不要）
- ✅ マイグレーション不要
- ✅ CLIでデータベースを構築する必要がない
- ✅ アプリケーションが自動的に使用

### PostgreSQL（Supabase）の役割

1. **メインデータベース**: すべての永続データを保存
   - ユーザーアカウント情報
   - カレンダー設定
   - イベントデータ
   - 同期履歴
   - など

**特徴**:
- ✅ リレーショナルデータベース（テーブル定義が必要）
- ✅ マイグレーションが必要
- ✅ スキーマ（テーブル構造）を定義する必要がある

## 🚀 セットアップ手順

### 1. Redis（Upstash）の設定

#### ✅ 既に完了していること
- UpstashでRedisプロジェクトを作成済み
- `.env.production`に`REDIS_URL`が設定済み

#### 🔧 接続テスト

```bash
# プロジェクトルートディレクトリから
node scripts/test-redis-connection.js
```

**注意**: Redisはスキーマレスなので、**CLIでデータベースを構築する必要はありません**。アプリケーションが自動的に使用します。

### 2. PostgreSQL（Supabase）の設定

#### ✅ 既に完了していること
- Supabaseプロジェクトが作成済み
- `.env.production`に`DATABASE_URL`が設定済み

#### 🔧 マイグレーションの実行

PostgreSQLはマイグレーションが必要です：

```bash
# プロジェクトルートディレクトリから
./scripts/run-migration.sh up
```

または、手動で：

```bash
cd backend
export DATABASE_URL="postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres"
npm run migrate:up
```

## 📝 現在の設定状況

### ✅ 設定済み

1. **Redis（Upstash）**
   ```
   REDIS_URL=rediss://default:***@enabling-flamingo-41628.upstash.io:6379
   ```
   - ✅ 接続文字列が設定済み
   - ✅ マイグレーション不要（スキーマレス）

2. **PostgreSQL（Supabase）**
   ```
   DATABASE_URL=postgresql://postgres:***@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres
   ```
   - ✅ 接続文字列が設定済み
   - ⚠️ マイグレーションが必要（まだ実行していない場合）

## 🎯 次のステップ

### 1. Redis接続のテスト

```bash
node scripts/test-redis-connection.js
```

成功すれば、Redisは使用可能です。

### 2. PostgreSQLマイグレーションの実行

```bash
./scripts/run-migration.sh up
```

これで、データベースのテーブルが作成されます。

### 3. 動作確認

```bash
# バックエンドを起動
cd backend
npm run dev
```

## ❓ よくある質問

### Q: Redis CLIでデータベースを構築する必要はありますか？

**A: いいえ、必要ありません。**
- Redisはスキーマレス（テーブル定義不要）です
- アプリケーションが自動的に使用します
- CLIで接続テストはできますが、データベース構築は不要です

### Q: Supabaseは使わないのですか？

**A: いいえ、Supabaseも必要です。**
- RedisとPostgreSQLは**別の役割**を持っています
- Redis: セッション、キュー（一時データ）
- PostgreSQL: ユーザー、カレンダー、イベント（永続データ）
- **両方必要**です

### Q: UpstashのRedis URLが`rediss://`になっていますが、問題ありませんか？

**A: 問題ありません。**
- `rediss://`はSSL/TLS接続を意味します
- UpstashはSSL接続が標準です
- アプリケーションコードで自動的にTLS設定が適用されます

## 🔍 トラブルシューティング

### Redis接続エラー

```bash
# 接続テストを実行
node scripts/test-redis-connection.js
```

**エラーが発生する場合**:
- `REDIS_URL`が正しく設定されているか確認
- Upstashのダッシュボードで接続情報を確認
- パスワードに特殊文字が含まれている場合はURLエンコードが必要

### PostgreSQL接続エラー

```bash
# マイグレーションを実行
./scripts/run-migration.sh up
```

**エラーが発生する場合**:
- `DATABASE_URL`が正しく設定されているか確認
- Supabaseのダッシュボードで接続情報を確認
- ネットワーク接続を確認

## 📚 参考リンク

- [Upstash Documentation](https://docs.upstash.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Redis Documentation](https://redis.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
