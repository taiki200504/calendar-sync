# 🔧 環境変数設定ステップバイステップガイド

## 📋 設定が必要な項目

1. **REDIS_URL** - ジョブキュー用のRedis接続URL
2. **FRONTEND_URL** - フロントエンドのURL

---

## 🔴 ステップ1: REDIS_URL の設定

Redis URLには2つの選択肢があります。どちらかを選んで設定してください。

### 選択肢A: Docker ComposeのRedisを使用（簡単・推奨）

この方法は、Docker Composeで起動するRedisコンテナを使用します。追加のセットアップは不要です。

#### 手順：

1. `.env.production`ファイルを開く
2. 13行目の`REDIS_URL=redis://default:[password]@[host]:[port]`を探す
3. 以下のように変更：

```bash
# 変更前
REDIS_URL=redis://default:[password]@[host]:[port]

# 変更後
REDIS_URL=redis://redis:6379
```

**完了！** これでDocker ComposeのRedisが使用されます。

---

### 選択肢B: Upstash Redisを使用（本番環境推奨）

この方法は、クラウド上のRedisサービス（Upstash）を使用します。本番環境ではこちらを推奨します。

#### 手順：

##### ステップ1: Upstashアカウントの作成

1. ブラウザで [https://upstash.com/](https://upstash.com/) にアクセス
2. 「Sign Up」または「Get Started」をクリック
3. アカウントを作成（GitHubアカウントでログインも可能）

##### ステップ2: Redis Databaseの作成

1. Upstashダッシュボードにログイン
2. 「Create Database」ボタンをクリック
3. 以下の設定を入力：
   - **Name**: `calendar-sync-redis`（任意の名前）
   - **Type**: `Regional`（デフォルト）
   - **Region**: 最寄りのリージョンを選択（例: `ap-northeast-1`）
4. 「Create」ボタンをクリック

##### ステップ3: 接続情報の取得

1. 作成したRedis Databaseをクリック
2. 「Details」タブまたは「Connect」タブを開く
3. 以下の情報を確認：
   - **Endpoint**（ホスト名）
   - **Port**（通常は6379）
   - **Password**（パスワード）

##### ステップ4: .env.productionに設定

1. `.env.production`ファイルを開く
2. 13行目の`REDIS_URL=redis://default:[password]@[host]:[port]`を探す
3. 取得した情報を使って以下の形式で設定：

```bash
# 形式: redis://default:[password]@[host]:[port]
# 例:
REDIS_URL=redis://default:AbCdEf123456@redis-12345.upstash.io:6379
```

**重要**: 
- `[password]`を実際のパスワードに置き換える
- `[host]`を実際のエンドポイント（ホスト名）に置き換える
- `[port]`を実際のポート番号に置き換える（通常は6379）

##### ステップ5: 接続テスト（オプション）

接続が正しいか確認するには、以下のコマンドを実行：

```bash
# Redis接続をテスト（Docker ComposeのRedisを使用する場合）
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
# 応答: PONG が返れば成功

# Upstash Redisを使用する場合、接続情報が正しいか確認
# （デプロイ後にログで確認できます）
```

---

## 🌐 ステップ2: FRONTEND_URL の設定

フロントエンドURLは、アプリケーションにアクセスする際のURLです。

### 現在の状況を確認

`.env.production`の21行目を見ると：
```bash
GOOGLE_REDIRECT_URI=https://calendarsync.com/api/auth/google/callback
```

この設定から、フロントエンドURLは `https://calendarsync.com` に設定する必要があります。

### 手順：

1. `.env.production`ファイルを開く
2. 35行目の`FRONTEND_URL=https://yourdomain.com`を探す
3. 以下のように変更：

```bash
# 変更前
FRONTEND_URL=https://yourdomain.com

# 変更後（GOOGLE_REDIRECT_URIと一致させる）
FRONTEND_URL=https://calendarsync.com
```

**重要**: 
- `FRONTEND_URL`と`GOOGLE_REDIRECT_URI`のドメイン部分（`calendarsync.com`）は一致している必要があります
- ローカルでテストする場合は `http://localhost` に設定することも可能ですが、OAuth認証が正しく動作しない可能性があります

---

## ✅ ステップ3: 設定の確認

すべての設定が完了したら、環境変数が正しく設定されているか確認します。

### 確認方法：

ターミナルで以下のコマンドを実行：

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS"
./scripts/check-env.sh
```

### 期待される結果：

```
✅ .env.production が見つかりました

📋 必須環境変数の確認:

✅ DATABASE_URL: 設定済み (postgresql://...)
✅ GOOGLE_CLIENT_ID: 設定済み (1331120186...)
✅ GOOGLE_CLIENT_SECRET: 設定済み (GOCSPX-a7xsa...)
✅ GOOGLE_REDIRECT_URI: 設定済み (https://calen...)
✅ JWT_SECRET: 設定済み (5xrGIu5xXZ7...)
✅ SESSION_SECRET: 設定済み (V1ZANSVW5m6...)
✅ ENCRYPTION_KEY: 設定済み (d2136b55ca7...)
✅ FRONTEND_URL: 設定済み (https://calend...)

✅ すべての必須環境変数が設定されています
```

すべて ✅ になっていれば、設定完了です！

---

## 🔍 ステップ4: Google OAuth設定の確認

`FRONTEND_URL`を変更した場合、Google Cloud Consoleの設定も確認する必要があります。

### 手順：

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. 左メニューから「APIとサービス」→「認証情報」をクリック
4. OAuth 2.0 クライアントIDをクリック
5. 「承認済みのリダイレクトURI」セクションを確認
6. 以下のURIが登録されているか確認：
   ```
   https://calendarsync.com/api/auth/google/callback
   ```
7. 登録されていない場合は、「URIを追加」をクリックして追加

---

## 📝 設定後のファイル例

設定が完了した`.env.production`の該当部分は以下のようになります：

```bash
# Redis
# Docker ComposeのRedisを使用する場合
REDIS_URL=redis://redis:6379

# または、Upstash Redisを使用する場合
# REDIS_URL=redis://default:AbCdEf123456@redis-12345.upstash.io:6379

# Server
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://calendarsync.com
```

---

## 🚀 次のステップ

環境変数の設定が完了したら、デプロイを実行できます：

```bash
./scripts/deploy.sh production
```

---

## ❓ よくある質問

### Q: ローカルでテストしたい場合は？

A: ローカルでテストする場合：
```bash
FRONTEND_URL=http://localhost
REDIS_URL=redis://redis:6379  # Docker ComposeのRedisを使用
```

ただし、OAuth認証をテストする場合は、Google Cloud Consoleで `http://localhost/api/auth/google/callback` も登録する必要があります。

### Q: Redis URLの形式がわからない

A: Upstashの場合、ダッシュボードの「Connect」タブに「Redis URL」として表示されているものをそのまま使用できます。

### Q: 設定を変更した後、どうすればいい？

A: 設定を変更した後は、コンテナを再起動する必要があります：
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production restart backend
```

---

## 🆘 トラブルシューティング

### エラー: 環境変数が読み込まれない

- `.env.production`ファイルが正しい場所にあるか確認
- ファイル名が`.env.production`であることを確認（`.env.production.txt`などではない）
- コマンド実行時に`--env-file .env.production`オプションを指定しているか確認

### エラー: Redis接続エラー

- `REDIS_URL`の形式が正しいか確認
- Docker ComposeのRedisを使用する場合、`redis://redis:6379`であることを確認
- Upstash Redisを使用する場合、パスワードとホスト名が正しいか確認

### エラー: OAuth認証エラー

- `FRONTEND_URL`と`GOOGLE_REDIRECT_URI`のドメインが一致しているか確認
- Google Cloud ConsoleでリダイレクトURIが登録されているか確認

---

**設定が完了したら、次のステップに進みましょう！** 🎉
