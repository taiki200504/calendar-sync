# 🚀 デプロイに必要なもの

## ⚠️ 現在の状況

`.env.production`ファイルに**プレースホルダー値**が設定されています。これらを**実際の値**に置き換える必要があります。

## 📋 必須項目（8つ）

### 1. **データベース接続情報** 🔴 必須
```
DATABASE_URL=postgresql://user:password@host:5432/database
```
**必要なもの:**
- Supabase PostgreSQL（推奨）または自前のPostgreSQLサーバー
- 接続文字列

**取得方法:**
- Supabase: プロジェクト設定 > Database > Connection string

---

### 2. **Redis接続情報** 🟡 推奨（ジョブキュー用）
```
REDIS_URL=redis://host:6379
```
**必要なもの:**
- Upstash Redis（推奨）または自前のRedisサーバー

**取得方法:**
- Upstash: ダッシュボードから接続情報を取得

---

### 3. **Google OAuth Client ID** 🔴 必須
```
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```
**必要なもの:**
- Google Cloud Consoleで作成したOAuth 2.0クライアントID

**取得方法:**
1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクト作成
2. APIとサービス > 認証情報 > OAuth 2.0 クライアント ID を作成
3. Client IDをコピー

---

### 4. **Google OAuth Client Secret** 🔴 必須
```
GOOGLE_CLIENT_SECRET=xxxxx
```
**必要なもの:**
- Google OAuth 2.0クライアントシークレット

**取得方法:**
- Google Cloud ConsoleのOAuth 2.0クライアント設定から取得

---

### 5. **Google OAuth リダイレクトURI** 🔴 必須
```
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```
**必要なもの:**
- 実際のドメインURL

**設定方法:**
- Google Cloud ConsoleのOAuth 2.0クライアント設定で「承認済みのリダイレクトURI」に追加

---

### 6. **JWT秘密鍵** 🔴 必須
```
JWT_SECRET=32文字以上のランダム文字列
```
**生成方法:**
```bash
openssl rand -base64 32
```

---

### 7. **セッション秘密鍵** 🔴 必須
```
SESSION_SECRET=32文字以上のランダム文字列
```
**生成方法:**
```bash
openssl rand -base64 32
```

---

### 8. **暗号化キー** 🔴 必須
```
ENCRYPTION_KEY=32文字の16進数
```
**生成方法:**
```bash
openssl rand -hex 16
```

---

### 9. **フロントエンドURL** 🔴 必須
```
FRONTEND_URL=https://yourdomain.com
```
**必要なもの:**
- 実際のドメインURL（本番環境）

---

## ✅ チェックリスト

- [ ] データベース（SupabaseまたはPostgreSQL）を用意
- [ ] Redis（Upstashまたは自前）を用意
- [ ] Google Cloud ConsoleでOAuth 2.0認証情報を作成
- [ ] セキュリティキー（JWT_SECRET、SESSION_SECRET、ENCRYPTION_KEY）を生成
- [ ] `.env.production`ファイルのプレースホルダー値を実際の値に置き換え
- [ ] 環境変数チェック: `./scripts/check-env.sh`

## 🚀 デプロイ手順（環境変数設定後）

```bash
# 1. 環境変数を確認
./scripts/check-env.sh

# 2. デプロイ実行
./scripts/deploy.sh production

# 3. マイグレーション（自動実行されますが、手動でも可能）
docker-compose -f docker-compose.prod.yml --env-file .env.production exec backend npm run migrate:up
```

## 📝 クイックセットアップ（セキュリティキー生成）

```bash
# ターミナルで実行
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "SESSION_SECRET=$(openssl rand -base64 32)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"
```

生成された値を`.env.production`にコピー＆ペーストしてください。

## 🔗 参考リンク

- **Supabase**: https://supabase.com/
- **Upstash Redis**: https://upstash.com/
- **Google Cloud Console**: https://console.cloud.google.com/
- **詳細ガイド**: `ENV_SETUP_GUIDE.md`
