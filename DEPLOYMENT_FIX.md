# デプロイ問題の修正

## ✅ 修正完了

### 1. `docker-compose.prod.yml`の修正
- ✅ `env_file: .env.production`を追加（backend、postgresサービス）
- ✅ `version: '3.8'`を削除（非推奨警告を解消）

### 2. 環境変数チェックスクリプト
- ✅ `scripts/check-env.sh`を作成

### 3. ドキュメント
- ✅ `ENV_SETUP_GUIDE.md`を作成（環境変数設定ガイド）

## ⚠️ 現在の問題

`.env.production`ファイルに**プレースホルダー値**が設定されています。以下の値を実際の値に置き換える必要があります：

- `DATABASE_URL` - プレースホルダー: `postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`
- `REDIS_URL` - プレースホルダー: `redis://default:[password]@[host]:[port]`
- `GOOGLE_CLIENT_ID` - プレースホルダー: `your-google-client-id.apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET` - プレースホルダー: `your-google-client-secret`
- `JWT_SECRET` - プレースホルダー: `your-super-secret-jwt-key-min-32-characters-change-this`
- `SESSION_SECRET` - プレースホルダー: `your-session-secret-key-min-32-characters-change-this`
- `ENCRYPTION_KEY` - プレースホルダー: `your-32-character-encryption-key-change-this`

## 📝 次のステップ

### 1. 環境変数を設定

詳細は `ENV_SETUP_GUIDE.md` を参照してください。

**クイックセットアップ:**

```bash
# セキュリティキーを生成
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)

echo "JWT_SECRET=$JWT_SECRET"
echo "SESSION_SECRET=$SESSION_SECRET"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
```

生成した値を`.env.production`に設定してください。

### 2. 環境変数を確認

```bash
./scripts/check-env.sh
```

### 3. デプロイ実行

```bash
# コンテナを停止（既に実行中の場合）
docker-compose -f docker-compose.prod.yml down

# デプロイスクリプトを使用
./scripts/deploy.sh production

# または手動で
docker-compose -f docker-compose.prod.yml up -d --build
```

### 4. マイグレーション実行

```bash
# コンテナが起動するまで少し待ってから
docker-compose -f docker-compose.prod.yml exec backend npm run migrate:up
```

### 5. ログ確認

```bash
docker-compose -f docker-compose.prod.yml logs -f backend
```

## 🔍 トラブルシューティング

### コンテナが再起動を繰り返す

環境変数が正しく設定されていない可能性があります。以下を確認：

1. `.env.production`ファイルが存在するか
2. プレースホルダー値が実際の値に置き換えられているか
3. 環境変数チェックスクリプトを実行：
   ```bash
   ./scripts/check-env.sh
   ```

### データベース接続エラー

- `DATABASE_URL`が正しく設定されているか確認
- Supabaseを使用する場合は、SSL接続が必要です（既に設定済み）

### OAuth認証エラー

- `GOOGLE_CLIENT_ID`と`GOOGLE_CLIENT_SECRET`が正しく設定されているか確認
- Google Cloud ConsoleでリダイレクトURIが正しく設定されているか確認

## 📚 参考ドキュメント

- `ENV_SETUP_GUIDE.md` - 環境変数設定の詳細ガイド
- `DEPLOYMENT.md` - デプロイ手順の詳細
- `DEPLOYMENT_CHECKLIST.md` - デプロイチェックリスト
