# CalendarSync OS - 開発状況と起動手順

## 📊 現状の開発状況

### 全体の完成度: **約90%**

プロジェクトはほぼ完成しており、主要機能は実装済みです。実際に動作させるために必要な設定と手順を以下にまとめます。

---

## 🎯 実装済み機能

### ✅ Phase 0: プロジェクトセットアップ (100%)
- TypeScript設定
- 依存関係のインストール
- プロジェクト構造の構築

### ✅ Phase 1: OAuth認証 + FreeBusy検索 (95%)
- Google OAuth 2.0認証フロー
- アカウント管理（accountsテーブル）
- FreeBusy API統合
- 空き時間検索UI

### ✅ Phase 2: 片方向同期 (85%)
- カレンダー同期サービス
- イベント取得・作成・更新
- Canonical Eventモデル
- Event Linkモデル
- 同期ワーカー

### ✅ Phase 3: 双方向同期 (90%)
- 競合検出機能
- 競合解決UI
- イベント伝播サービス
- Watch管理（Google Calendar Push通知）
- 除外ルール機能

---

## 🚀 実際に使えるようにするために必要な手順

### ステップ1: 前提条件の確認

以下のツールがインストールされていることを確認してください：

```bash
# Node.js 20以上
node --version  # v20.x.x 以上であることを確認

# Docker & Docker Compose
docker --version
docker-compose --version

# npm
npm --version
```

---

### ステップ2: 依存関係のインストール

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

---

### ステップ3: 環境変数の設定

#### 3-1. Backend環境変数

```bash
cd backend
cp env.example .env
```

`.env`ファイルを編集して、以下の値を設定してください：

**必須項目**:
```env
# Google OAuth 2.0認証情報（Google Cloud Consoleで取得）
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# データベース接続（Docker Compose使用時）
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/calendar_sync

# Redis接続（Docker Compose使用時）
REDIS_URL=redis://localhost:6379

# セキュリティキー（32文字のランダム文字列）
ENCRYPTION_KEY=生成した32文字のキー
SESSION_SECRET=生成したランダム文字列
JWT_SECRET=生成したランダム文字列

# サーバー設定
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**セキュリティキーの生成方法**:
```bash
# ENCRYPTION_KEY（32文字）
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# SESSION_SECRET（64文字以上推奨）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT_SECRET（64文字以上推奨）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3-2. Frontend環境変数

```bash
cd frontend
cp env.example .env
```

`.env`ファイルを編集：
```env
VITE_API_URL=http://localhost:3000/api
```

---

### ステップ4: Google Cloud Consoleの設定

1. **Google Cloud Consoleにアクセス**
   - https://console.cloud.google.com/

2. **プロジェクトを作成または選択**

3. **Google Calendar APIを有効化**
   - 「APIとサービス」→「ライブラリ」
   - 「Google Calendar API」を検索して「有効にする」

4. **OAuth同意画面を設定**
   - 「APIとサービス」→「OAuth同意画面」
   - ユーザータイプを選択（外部または内部）
   - アプリ情報を入力
   - スコープを追加:
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/calendar.events.freebusy`
   - テストユーザーを追加（開発中の場合）

5. **OAuth 2.0 クライアントIDを作成**
   - 「認証情報」→「認証情報を作成」→「OAuth 2.0 クライアントID」
   - アプリケーションの種類: **Webアプリケーション**
   - 名前: "CalendarSync OS"
   - 承認済みのリダイレクトURI:
     - `http://localhost:3000/api/auth/google/callback`
   - 「作成」をクリック
   - クライアントIDとシークレットをコピーして`.env`に設定

---

### ステップ5: データベースとRedisの起動

```bash
# プロジェクトルートで実行
docker-compose up -d
```

以下のサービスが起動します：
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

**確認方法**:
```bash
docker ps
# calendar-sync-postgres と calendar-sync-redis が表示されればOK
```

---

### ステップ6: データベースマイグレーション

```bash
cd backend
npm run migrate:up
```

**マイグレーション確認**:
```bash
# PostgreSQLに接続してテーブルを確認
docker exec -it calendar-sync-postgres psql -U postgres -d calendar_sync

# テーブル一覧を確認
\dt

# 以下のテーブルが作成されていることを確認:
# - accounts
# - calendars
# - canonical_events
# - event_links
# - sync_ops
# - sync_log
# - watch_channels
```

---

### ステップ7: アプリケーションの起動

#### 7-1. Backendの起動

```bash
cd backend
npm run dev
```

Backendは`http://localhost:3000`で起動します。

**確認方法**:
- ブラウザで `http://localhost:3000/api/health` にアクセス（エンドポイントが存在する場合）
- または、ターミナルに「🚀 Server running on port 3000」と表示されればOK

#### 7-2. Frontendの起動（別ターミナル）

```bash
cd frontend
npm run dev
```

Frontendは`http://localhost:5173`で起動します。

**確認方法**:
- ブラウザで `http://localhost:5173` にアクセス
- ログインページが表示されればOK

---

### ステップ8: 動作確認

1. **ブラウザで `http://localhost:5173` にアクセス**
2. **「Googleでログイン」をクリック**
3. **Googleアカウントで認証**
4. **ダッシュボードが表示されれば成功**

---

## ⚠️ よくある問題と解決方法

### 問題1: "Missing required OAuth environment variables"
**原因**: `.env`ファイルの環境変数が設定されていない

**解決方法**:
1. `backend/.env`ファイルが存在することを確認
2. `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_REDIRECT_URI`が設定されていることを確認
3. サーバーを再起動

### 問題2: "ENCRYPTION_KEY must be exactly 32 characters long"
**原因**: `ENCRYPTION_KEY`が32文字ではない

**解決方法**:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```
生成された32文字のキーを`.env`に設定

### 問題3: "redirect_uri_mismatch"
**原因**: Google Cloud ConsoleのリダイレクトURIと`.env`の設定が一致していない

**解決方法**:
1. Google Cloud Consoleの「承認済みのリダイレクトURI」を確認
2. `.env`の`GOOGLE_REDIRECT_URI`と完全に一致させる
3. プロトコル、ドメイン、パス、ポート番号まで正確に一致させる

### 問題4: データベース接続エラー
**原因**: PostgreSQLが起動していない、または接続文字列が間違っている

**解決方法**:
```bash
# Docker Composeで起動しているか確認
docker ps

# 起動していない場合
docker-compose up -d

# 接続文字列を確認
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/calendar_sync
```

### 問題5: Redis接続エラー
**原因**: Redisが起動していない

**解決方法**:
```bash
# Docker Composeで起動しているか確認
docker ps

# 起動していない場合
docker-compose up -d
```

---

## 📋 チェックリスト

実際に使えるようにするためのチェックリスト：

- [ ] Node.js 20以上がインストールされている
- [ ] Docker & Docker Composeがインストールされている
- [ ] Backendの依存関係をインストール済み（`npm install`）
- [ ] Frontendの依存関係をインストール済み（`npm install`）
- [ ] Backendの`.env`ファイルを作成・設定済み
- [ ] Frontendの`.env`ファイルを作成・設定済み
- [ ] Google Cloud Consoleでプロジェクトを作成
- [ ] Google Calendar APIを有効化
- [ ] OAuth同意画面を設定
- [ ] OAuth 2.0 クライアントIDを作成
- [ ] リダイレクトURIを設定
- [ ] Docker ComposeでPostgreSQLとRedisを起動
- [ ] データベースマイグレーションを実行
- [ ] Backendサーバーを起動
- [ ] Frontendサーバーを起動
- [ ] ブラウザでログインできることを確認

---

## 🎯 次のステップ

アプリケーションが起動したら、以下の機能を試してみてください：

1. **カレンダーの追加**
   - カレンダーページでGoogleカレンダーを追加

2. **空き時間検索**
   - FindSlotsページで複数カレンダーの空き時間を検索

3. **同期設定**
   - SyncPageで同期間隔や動作を設定

4. **手動同期**
   - ダッシュボードから手動で同期を実行

5. **競合解決**
   - 競合が発生した場合、ConflictDetailページで解決

---

## 📚 参考ドキュメント

- [環境変数設定ガイド](./ENV_SETUP.md) - 詳細な環境変数の説明
- [プロジェクト状況レポート](./PROJECT_STATUS.md) - 実装状況の詳細
- [次のステップ](./NEXT_STEPS.md) - 今後の開発計画

---

## 💡 トラブルシューティング

問題が解決しない場合は、以下を確認してください：

1. **ログの確認**
   - Backend: ターミナルのエラーメッセージを確認
   - Frontend: ブラウザの開発者ツール（Console）を確認

2. **環境変数の再確認**
   - `.env`ファイルの値が正しいか確認
   - サーバーを再起動

3. **データベースの状態確認**
   ```bash
   docker exec -it calendar-sync-postgres psql -U postgres -d calendar_sync -c "\dt"
   ```

4. **Redisの状態確認**
   ```bash
   docker exec -it calendar-sync-redis redis-cli ping
   # "PONG" が返ってくればOK
   ```

---

以上で、CalendarSync OSを実際に使える状態にすることができます！
