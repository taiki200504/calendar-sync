# ✅ Vercelデプロイチェックリスト

## 📋 確認済み項目

### ✅ 基本設定
- [x] `vercel.json` が存在する
- [x] `api/index.ts` が存在する（Serverless Functions用）
- [x] `.vercelignore` が存在する
- [x] フロントエンドのビルド設定が正しい

### ✅ 環境変数（Vercelダッシュボードで設定が必要）
- [x] `DATABASE_URL` - PostgreSQL接続文字列
- [x] `REDIS_URL` - Redis接続文字列（セッションストア用）
- [x] `GOOGLE_CLIENT_ID` - Google OAuth 2.0 Client ID
- [x] `GOOGLE_CLIENT_SECRET` - Google OAuth 2.0 Client Secret
- [x] `GOOGLE_REDIRECT_URI` - OAuthコールバックURI（例: `https://your-domain.vercel.app/api/auth/google/callback`）
- [x] `JWT_SECRET` - JWT署名用の秘密鍵（32文字以上）
- [x] `SESSION_SECRET` - セッション署名用の秘密鍵（32文字以上）
- [x] `ENCRYPTION_KEY` - 暗号化キー（32文字の16進数）
- [x] `FRONTEND_URL` - フロントエンドURL（例: `https://your-domain.vercel.app`）
- [x] `NODE_ENV=production`
- [x] `CRON_SECRET` - Cron Jobs認証用の秘密鍵（任意の文字列、Vercelが自動的に設定する場合は不要）

## ⚠️ 対応が必要な項目

### 1. データベースマイグレーション

**問題**: Vercel Serverless Functionsでは、デプロイ時に自動的にマイグレーションを実行できません。

**解決方法**:
1. **初回デプロイ前**に手動でマイグレーションを実行する必要があります
2. 以下のいずれかの方法を使用：

#### 方法A: ローカルから実行（推奨）
```bash
# 環境変数を設定
export DATABASE_URL="your-production-database-url"

# マイグレーションを実行
cd backend
npm run migrate:up
```

#### 方法B: 別のサーバーから実行
- Railway、Render、Herokuなどの別のプラットフォームで一時的にバックエンドをデプロイ
- マイグレーションを実行
- その後、Vercelにデプロイ

#### 方法C: Vercel CLIから実行（要検証）
```bash
# Vercel CLIで環境変数を設定してから
vercel env pull .env.production
cd backend
npm run migrate:up
```

### 2. ワーカー処理（BullMQ）

**問題**: Vercel Serverless Functionsでは、BullMQワーカーは実行できません。

**影響を受ける機能**:
- 定期同期（`syncScheduler.ts`）
- バックグラウンドジョブ処理（`sync.worker.ts`）

**解決方法**:
1. **Vercel Cron Jobs**を使用して定期同期を実装
2. または、別のサービス（Railway、Render、Heroku）でワーカーを実行

### 3. Cronジョブ（node-cron）

**問題**: `node-cron`はVercel Serverless Functionsでは動作しません。

**影響を受ける機能**:
- 定期同期スケジューラー（`syncScheduler.ts`）
- Watch更新ジョブ（`watch-renewal.job.ts`）

**解決方法**: `vercel.json`にCron Jobs設定を追加（後述）

### 4. セッションストア

**問題**: メモリベースのセッションストアは、Serverless Functionsでは複数のインスタンス間で共有されません。

**解決方法**: 
- Redisを使用したセッションストアを実装する必要があります
- `api/index.ts`でRedisセッションストアを設定（要実装）

## 🔧 追加で必要な設定

### 1. Vercel Cron Jobs設定

✅ **完了**: `vercel.json`にCron Jobs設定を追加済み

### 2. Cron用のAPIエンドポイント作成

✅ **完了**: 以下のファイルを作成済み
- `api/cron/sync.ts` - 定期同期用Cron Job
- `api/cron/watch-renewal.ts` - Watch更新用Cron Job

**注意**: 
- Vercel Cron Jobsは自動的に認証ヘッダーを追加しますが、手動で設定する場合は`CRON_SECRET`環境変数を設定してください
- 実際のVercel環境では、認証ヘッダーは自動的に設定されるため、`CRON_SECRET`のチェックはオプションです

### 3. Redisセッションストアの実装

`api/index.ts`でRedisを使用したセッションストアを設定する必要があります。

## 📝 デプロイ前の確認事項

1. [ ] すべての環境変数がVercelダッシュボードで設定されている
2. [ ] Google OAuthのリダイレクトURIが正しく設定されている
3. [ ] データベースマイグレーションが実行されている
4. [ ] Redisが利用可能で、接続文字列が正しい
5. [ ] `vercel.json`の設定が正しい
6. [ ] フロントエンドのビルドが成功する
7. [ ] バックエンドのビルドが成功する

## 🚀 デプロイ手順

1. **環境変数を設定**
   ```bash
   vercel env add DATABASE_URL
   vercel env add REDIS_URL
   vercel env add GOOGLE_CLIENT_ID
   vercel env add GOOGLE_CLIENT_SECRET
   vercel env add GOOGLE_REDIRECT_URI
   vercel env add JWT_SECRET
   vercel env add SESSION_SECRET
   vercel env add ENCRYPTION_KEY
   vercel env add FRONTEND_URL
   vercel env add NODE_ENV production
   ```

2. **データベースマイグレーションを実行**（初回のみ）

3. **デプロイ**
   ```bash
   vercel --prod
   ```

4. **動作確認**
   - ヘルスチェック: `https://your-domain.vercel.app/api/health`
   - OAuth認証のテスト
   - フロントエンドの表示確認

## 🔍 トラブルシューティング

### ビルドエラー
- `vercel.json`の`buildCommand`を確認
- ローカルで`npm run build`が成功するか確認

### APIルートが404
- `vercel.json`の`rewrites`設定を確認
- `/api/*`が正しく`/api/index`にルーティングされているか確認

### セッションが保持されない
- Redisセッションストアが実装されているか確認
- `sameSite: 'none'`と`secure: true`が設定されているか確認

### データベース接続エラー
- `DATABASE_URL`が正しく設定されているか確認
- Supabaseを使用する場合は、SSL接続が必要

## 📚 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
