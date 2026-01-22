# 📊 デプロイ準備状況

## ✅ 設定済み（7/9項目）

1. ✅ **DATABASE_URL** - Supabase接続文字列が設定済み
2. ✅ **GOOGLE_CLIENT_ID** - 実際の値が設定済み
3. ✅ **GOOGLE_CLIENT_SECRET** - 実際の値が設定済み
4. ✅ **GOOGLE_REDIRECT_URI** - 実際の値が設定済み
5. ✅ **JWT_SECRET** - セキュリティキーが生成済み
6. ✅ **SESSION_SECRET** - セキュリティキーが生成済み
7. ✅ **ENCRYPTION_KEY** - 暗号化キーが生成済み

## ❌ 未設定（2/9項目）

### 1. **REDIS_URL** 🔴 必須（ジョブキュー用）

**現在の状態:**
```
REDIS_URL=redis://default:[password]@[host]:[port]
```
→ **プレースホルダーのまま**

**必要なもの:**
- Upstash Redis（推奨）または自前のRedisサーバー

**設定方法:**

#### オプションA: Upstash Redis（推奨・無料枠あり）
1. [Upstash](https://upstash.com/)でアカウント作成
2. Redis Databaseを作成
3. REST URLをコピー
4. `.env.production`の`REDIS_URL`を更新：
   ```
   REDIS_URL=redis://default:[password]@[host]:[port]
   ```

#### オプションB: 自前のRedis（docker-composeで起動済み）
既に`docker-compose.prod.yml`でRedisが起動している場合：
```
REDIS_URL=redis://redis:6379
```

---

### 2. **FRONTEND_URL** 🔴 必須

**現在の状態:**
確認が必要

**必要なもの:**
- 実際のドメインURL（本番環境）

**設定例:**
```
FRONTEND_URL=https://calendarsync.com
```

---

## 🚀 次のステップ

### 1. REDIS_URLを設定

**最も簡単な方法（docker-composeのRedisを使用）:**
```bash
# .env.productionを編集
REDIS_URL=redis://redis:6379
```

**または、Upstash Redisを使用:**
1. [Upstash](https://upstash.com/)でRedis Databaseを作成
2. 接続情報を取得
3. `.env.production`に設定

### 2. FRONTEND_URLを確認・設定

```bash
# .env.productionを編集
FRONTEND_URL=https://calendarsync.com  # 実際のドメインに変更
```

### 3. 環境変数を再確認

```bash
./scripts/check-env.sh
```

### 4. デプロイ実行

```bash
./scripts/deploy.sh production
```

---

## 📝 クイック修正

`.env.production`ファイルを開いて、以下を修正：

```bash
# Redis（docker-composeのRedisを使用する場合）
REDIS_URL=redis://redis:6379

# フロントエンドURL（実際のドメインに変更）
FRONTEND_URL=https://calendarsync.com
```

これで準備完了です！
