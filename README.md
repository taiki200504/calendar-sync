# CalendarSync OS

複数のGoogleカレンダーを双方向同期するシステム

## 概要

CalendarSync OSは、複数のGoogleカレンダー間でイベントを自動的に双方向同期するWebアプリケーションです。Google OAuth 2.0を使用して認証し、BullMQとRedisを使用して非同期で同期処理を実行します。

## 技術スタック

### Backend
- **Node.js 20** + **Express** + **TypeScript**
- **PostgreSQL 15** - データベース
- **BullMQ** + **Redis 7** - ジョブキュー
- **Google Calendar API** - カレンダー操作
- **Google OAuth 2.0** - 認証

### Frontend
- **React 18** + **TypeScript**
- **Vite** - ビルドツール
- **TailwindCSS** - スタイリング
- **TanStack Query** - データフェッチング
- **React Router** - ルーティング

## プロジェクト構造

```
calendar-sync-os/
├── backend/              # Backendアプリケーション
│   ├── src/
│   │   ├── controllers/  # ルートハンドラー
│   │   ├── services/     # ビジネスロジック
│   │   ├── models/       # データモデル
│   │   ├── queues/       # BullMQキュー定義
│   │   ├── workers/      # キューワーカー
│   │   ├── jobs/         # Cronジョブ
│   │   ├── middleware/   # 認証・エラーハンドリング
│   │   ├── utils/        # ヘルパー関数
│   │   └── types/        # TypeScript型定義
│   ├── migrations/       # DB migration
│   └── tests/            # テスト
├── frontend/             # Frontendアプリケーション
│   ├── src/
│   │   ├── components/   # 再利用可能コンポーネント
│   │   ├── pages/        # ページコンポーネント
│   │   ├── hooks/        # カスタムフック
│   │   ├── services/     # API通信
│   │   ├── types/        # TypeScript型
│   │   └── utils/        # ヘルパー
└── docker-compose.yml     # Docker Compose設定
```

## セットアップ

### 前提条件

- Node.js 20以上
- Docker & Docker Compose
- PostgreSQL 15（Dockerで起動可能）
- Redis 7（Dockerで起動可能）
- Google Cloud Platform アカウント（OAuth認証用）

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd calendar-sync-os
```

### 2. 環境変数の設定

#### Backend

```bash
cd backend
cp .env.example .env
```

`.env`ファイルを編集して、以下の値を設定してください：

- `GOOGLE_CLIENT_ID` - Google Cloud Consoleで取得
- `GOOGLE_CLIENT_SECRET` - Google Cloud Consoleで取得
- `GOOGLE_REDIRECT_URI` - OAuthリダイレクトURI
- `JWT_SECRET` - JWT署名用の秘密鍵
- `DATABASE_URL` - PostgreSQL接続文字列
- `REDIS_URL` - Redis接続文字列

#### Frontend

```bash
cd frontend
cp .env.example .env
```

`.env`ファイルで`VITE_API_URL`を設定してください。

### 3. Google Cloud Console設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. APIとサービス > ライブラリから「Google Calendar API」を有効化
4. 認証情報 > OAuth 2.0 クライアントIDを作成
   - アプリケーションの種類: Webアプリケーション
   - 承認済みのリダイレクトURI: `http://localhost:3000/api/auth/google/callback`
5. クライアントIDとシークレットを`.env`に設定

### 4. Docker ComposeでデータベースとRedisを起動

```bash
docker-compose up -d
```

### 5. データベースマイグレーション

```bash
cd backend
npm install
npm run migrate:up
```

または、SQLファイルを直接実行：

```bash
psql -h localhost -U postgres -d calendar_sync -f migrations/001_initial_schema.sql
```

### 6. Backendの起動

```bash
cd backend
npm install
npm run dev
```

Backendは`http://localhost:3000`で起動します。

### 7. Frontendの起動

```bash
cd frontend
npm install
npm run dev
```

Frontendは`http://localhost:5173`で起動します。

### 8. ワーカーの起動（別ターミナル）

```bash
cd backend
npm run dev
# または、ワーカー専用のスクリプトを作成する場合
# node dist/workers/syncWorker.js
```

## 使用方法

1. ブラウザで`http://localhost:5173`にアクセス
2. 「Googleでログイン」をクリック
3. Googleアカウントで認証
4. カレンダーページで同期したいGoogleカレンダーを追加
5. 同期設定ページで同期間隔や動作を設定
6. 手動同期または自動同期でカレンダーを同期

## APIエンドポイント

### 認証
- `GET /api/auth/google` - Google OAuth認証URL取得
- `GET /api/auth/google/callback` - OAuthコールバック処理
- `POST /api/auth/refresh` - トークン更新
- `POST /api/auth/logout` - ログアウト

### カレンダー
- `GET /api/calendars` - カレンダー一覧取得
- `POST /api/calendars` - カレンダー追加
- `PUT /api/calendars/:id` - カレンダー更新
- `DELETE /api/calendars/:id` - カレンダー削除
- `GET /api/calendars/:id/events` - イベント取得

### 同期
- `GET /api/sync/settings` - 同期設定取得
- `PUT /api/sync/settings` - 同期設定更新
- `POST /api/sync/manual` - 手動同期実行
- `GET /api/sync/status/:jobId` - 同期ステータス取得
- `GET /api/sync/history` - 同期履歴取得

## 開発

### Backend開発

```bash
cd backend
npm run dev        # 開発モード（tsx watch）
npm run build      # ビルド
npm run start      # 本番モード
npm test           # テスト実行
```

### Frontend開発

```bash
cd frontend
npm run dev        # 開発サーバー起動
npm run build      # ビルド
npm run preview    # ビルド結果のプレビュー
```

## データベーススキーマ

- `users` - ユーザー情報とOAuthトークン
- `calendars` - 登録されたGoogleカレンダー
- `sync_settings` - ユーザーごとの同期設定
- `sync_history` - 同期実行履歴

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずイシューを開いて変更内容を議論してください。
