# Supabase認証についての説明

## ⚠️ 重要な確認事項

このプロジェクトでは、**Supabaseの認証機能は使用していません**。

### 現在の認証実装

1. **独自のGoogle OAuth 2.0実装**を使用
   - `backend/src/controllers/auth.controller.ts`
   - `backend/src/services/oauth.service.ts`
   - Google Cloud Consoleで設定したOAuth 2.0クライアントを使用

2. **セッション管理**
   - `express-session` + Redis（Upstash）
   - セッションはRedisに保存されます

3. **Supabaseの役割**
   - **PostgreSQLデータベースとしてのみ使用**
   - 認証には使用していません

## 🔍 エラーの可能性

もしSupabase関連のエラーが出ている場合、以下の可能性があります：

### 1. データベース接続エラー

**症状**: 
- `getaddrinfo ENOTFOUND base`
- `Connection refused`
- `SSL connection required`

**原因**: 
- `DATABASE_URL`が正しく設定されていない
- Supabaseの接続文字列が間違っている
- ネットワーク接続の問題

**確認方法**:
```bash
# 環境変数を確認
vercel env ls | grep DATABASE_URL

# データベース接続をテスト
cd backend
npm run migrate:up
```

### 2. SSL接続の問題

**症状**: 
- `SSL connection required`
- `certificate verify failed`

**原因**: 
- SupabaseはSSL接続が必須
- SSL設定が正しくない

**確認方法**:
`backend/src/utils/database.ts`でSSL設定を確認：
```typescript
if (isSupabase) {
  // Supabase接続の場合はSSLが必要
  config.ssl = { rejectUnauthorized: false };
}
```

### 3. 認証エラー（Supabase認証ではない）

**症状**: 
- "Invalid state parameter"
- "Authentication failed"
- OAuth認証が失敗する

**原因**: 
- Google OAuth設定の問題
- セッション管理の問題（既に修正済み）

**確認方法**:
- Google Cloud ConsoleのOAuth設定を確認
- Vercelの環境変数（`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`）を確認

## ✅ 確認すべき項目

### 1. Supabaseの設定（データベースとして）

Supabaseの認証設定は**不要**ですが、データベース接続は正しく設定されている必要があります：

1. **Supabaseプロジェクトが作成されている**
2. **`DATABASE_URL`が正しく設定されている**
   ```
   DATABASE_URL=postgresql://postgres:パスワード@db.プロジェクトID.supabase.co:5432/postgres
   ```
3. **データベースマイグレーションが実行されている**
   ```bash
   cd backend
   npm run migrate:up
   ```

### 2. Google OAuth設定（認証用）

Supabase認証ではなく、Google OAuth設定を確認：

1. **Google Cloud Console**
   - OAuth 2.0クライアントIDが作成されている
   - 承認済みのリダイレクトURIが設定されている
   - `GOOGLE_CLIENT_ID`と`GOOGLE_CLIENT_SECRET`がVercelに設定されている

2. **Vercel環境変数**
   ```bash
   vercel env ls | grep GOOGLE
   ```

## 🐛 エラーの確認方法

### Vercelのログを確認

```bash
# 最新のデプロイメントのログを確認
vercel logs --follow

# 特定のデプロイメントのログを確認
vercel inspect [デプロイメントURL] --logs
```

### ブラウザのコンソールを確認

1. ブラウザでアプリにアクセス
2. F12で開発者ツールを開く
3. Consoleタブでエラーを確認
4. NetworkタブでAPIリクエストのエラーを確認

### データベース接続をテスト

```bash
# マイグレーションを実行して接続をテスト
cd backend
npm run migrate:up
```

## 📝 まとめ

- ✅ **Supabase認証は不要**: このプロジェクトでは使用していません
- ✅ **Supabaseはデータベースとして使用**: PostgreSQL接続のみ
- ✅ **認証は独自実装**: Google OAuth 2.0を使用
- ⚠️ **エラーが出ている場合**: 上記の確認項目をチェック

## 🔧 次のステップ

もしエラーが出ている場合は、以下を確認してください：

1. **エラーメッセージの内容**を共有してください
2. **Vercelのログ**を確認してください
3. **ブラウザのコンソール**でエラーを確認してください

具体的なエラーメッセージがあれば、それに基づいて対処方法を提案できます。
