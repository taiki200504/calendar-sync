# テストサーバー起動ガイド

## 🚀 クイックスタート

### 方法1: 起動スクリプトを使用（推奨）

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS"
./scripts/start-dev.sh
```

このスクリプトが以下を自動的に実行します：
- 既存のプロセスを停止
- Dockerコンテナの確認・起動
- Backendサーバーの起動
- Frontendサーバーの起動
- 起動確認

### 方法2: 手動で起動

#### 1. 既存のプロセスを停止

```bash
./scripts/stop-dev.sh
```

または

```bash
pkill -f "tsx watch" && pkill -f "vite"
```

#### 2. Dockerコンテナを起動（必要に応じて）

```bash
docker-compose up -d
```

#### 3. Backendを起動

```bash
cd backend
npm run dev
```

#### 4. Frontendを起動（別ターミナル）

```bash
cd frontend
npm run dev
```

---

## 📊 サーバーステータスの確認

```bash
./scripts/check-status.sh
```

または

```bash
# Backend
curl http://localhost:3000/health

# Frontend
curl http://localhost:5173
```

---

## 🛑 サーバーの停止

```bash
./scripts/stop-dev.sh
```

または

```bash
pkill -f "tsx watch" && pkill -f "vite"
```

---

## 📝 ログの確認

### Backendログ

```bash
tail -f /tmp/backend-dev.log
```

### Frontendログ

```bash
tail -f /tmp/frontend-dev.log
```

---

## 🌐 アクセスURL

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

---

## ✅ 動作確認チェックリスト

- [ ] Dockerコンテナが起動している（PostgreSQL、Redis）
- [ ] Backendサーバーが起動している（ポート3000）
- [ ] Frontendサーバーが起動している（ポート5173）
- [ ] Health Checkエンドポイントが応答する
- [ ] ブラウザでFrontendにアクセスできる
- [ ] OAuth認証情報が設定されている（ログインする場合）

---

## 🔧 トラブルシューティング

### Backendが起動しない

1. ポート3000が使用中でないか確認:
   ```bash
   lsof -ti:3000
   ```

2. 環境変数が正しく設定されているか確認:
   ```bash
   cd backend
   node scripts/check-env.js
   ```

3. ログを確認:
   ```bash
   tail -50 /tmp/backend-dev.log
   ```

### Frontendが起動しない

1. ポート5173が使用中でないか確認:
   ```bash
   lsof -ti:5173
   ```

2. ログを確認:
   ```bash
   tail -50 /tmp/frontend-dev.log
   ```

### Dockerコンテナが起動しない

```bash
docker-compose up -d
docker ps
```

---

## 📚 関連ドキュメント

- `GETTING_STARTED.md` - 詳細なセットアップ手順
- `OAUTH_SETUP_GUIDE.md` - OAuth認証の設定方法
- `QUICK_OAUTH_SETUP.md` - OAuth設定のクイックガイド

---

## 🎯 次のステップ

1. ブラウザで `http://localhost:5173` にアクセス
2. ログインページが表示されることを確認
3. OAuth認証情報を設定済みの場合は、ログインを試す

OAuth認証情報が未設定の場合は、以下を実行:

```bash
cd backend
node scripts/setup-oauth.js
```

または `QUICK_OAUTH_SETUP.md` を参照してください。
