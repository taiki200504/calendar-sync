# 環境変数設定ガイド

このドキュメントでは、CalendarSync OSの環境変数の設定方法を詳しく説明します。

## 目次

1. [バックエンド環境変数](#バックエンド環境変数)
2. [フロントエンド環境変数](#フロントエンド環境変数)
3. [設定手順](#設定手順)

---

## バックエンド環境変数

### 1. Google OAuth 2.0 認証情報

#### GOOGLE_CLIENT_ID
**説明**: Google OAuth 2.0認証で使用するクライアントID

**取得方法**:
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択（または新規作成）
3. 左メニューから「APIとサービス」→「認証情報」を選択
4. 「認証情報を作成」→「OAuth 2.0 クライアントID」を選択
5. アプリケーションの種類: **Webアプリケーション**を選択
6. 名前を入力（例: "CalendarSync OS"）
7. 「承認済みのリダイレクトURI」に以下を追加:
   - 開発環境: `http://localhost:3000/api/auth/google/callback`
   - 本番環境: `https://yourdomain.com/api/auth/google/callback`
8. 「作成」をクリック
9. 表示された「クライアントID」をコピー

**設定例**:
```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

**注意点**:
- クライアントIDは公開情報ですが、シークレットと混同しないでください
- 本番環境では、承認済みのリダイレクトURIを正確に設定してください

---

#### GOOGLE_CLIENT_SECRET
**説明**: Google OAuth 2.0認証で使用するクライアントシークレット

**取得方法**:
1. 上記の「OAuth 2.0 クライアントID」作成時に表示される「クライアントシークレット」をコピー
2. 一度閉じると再表示できないため、必ずコピーして保存してください

**設定例**:
```env
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz123456
```

**注意点**:
- **絶対に公開しないでください**（GitHubにコミットしない）
- 漏洩した場合は、Google Cloud Consoleで再生成してください
- `.env`ファイルは`.gitignore`に含まれていることを確認してください

---

#### GOOGLE_REDIRECT_URI
**説明**: OAuth認証後のリダイレクト先URI

**設定例**:
```env
# 開発環境
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# 本番環境
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

**注意点**:
- Google Cloud Consoleで設定した「承認済みのリダイレクトURI」と**完全に一致**させる必要があります
- プロトコル（http/https）、ドメイン、パス、ポート番号まで正確に一致させる必要があります
- 末尾のスラッシュ（/）の有無も一致させる必要があります

---

### 2. データベース設定

#### DATABASE_URL
**説明**: PostgreSQLデータベースへの接続文字列

**形式**:
```
postgresql://[ユーザー名]:[パスワード]@[ホスト]:[ポート]/[データベース名]
```

**設定例**:

**ローカル開発環境（Docker Compose使用）**:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/calendar_sync
```

**Supabase（本番環境）**:
```env
# 直接接続
DATABASE_URL=postgresql://postgres:[パスワード]@db.[project-ref].supabase.co:5432/postgres

# プーラー接続（推奨）
DATABASE_URL=postgresql://postgres.[project-ref]:[パスワード]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**取得方法（Supabase）**:
1. [Supabase](https://supabase.com/)にアクセス
2. プロジェクトを選択
3. 左メニューから「Settings」→「Database」を選択
4. 「Connection string」セクションから接続文字列をコピー
5. `[YOUR-PASSWORD]`を実際のパスワードに置き換え

**注意点**:
- パスワードに特殊文字が含まれる場合は、URLエンコードが必要な場合があります
- Supabaseの場合は、SSL接続が自動的に有効になります
- 本番環境では、プーラー接続を使用することを推奨します

---

### 3. Redis設定

#### REDIS_URL
**説明**: Redisへの接続文字列

**設定例**:

**ローカル開発環境（Docker Compose使用）**:
```env
REDIS_URL=redis://localhost:6379
```

**本番環境（Redis Cloud等）**:
```env
REDIS_URL=redis://:[パスワード]@[ホスト]:[ポート]
```

**注意点**:
- パスワードが設定されている場合は、`redis://:[パスワード]@[ホスト]:[ポート]`の形式で指定
- パスワードに特殊文字が含まれる場合は、URLエンコードが必要です

---

### 4. セキュリティ設定

#### ENCRYPTION_KEY
**説明**: OAuthトークンの暗号化に使用する32文字のキー

**生成方法**:

**方法1: Node.jsで生成（推奨）**:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```
このコマンドで32文字の16進数文字列が生成されます。

**方法2: OpenSSLで生成**:
```bash
openssl rand -hex 16
```

**方法3: オンラインツール**:
- [Random.org](https://www.random.org/strings/)などで32文字のランダム文字列を生成

**設定例**:
```env
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**注意点**:
- **必ず32文字**である必要があります（16バイト = 32文字の16進数）
- **絶対に公開しないでください**
- 一度設定したら変更しないでください（変更すると既存の暗号化されたトークンが復号できなくなります）
- 本番環境では、必ず新しいキーを生成してください

---

#### SESSION_SECRET
**説明**: セッション管理で使用する秘密鍵

**生成方法**:

**方法1: Node.jsで生成**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**方法2: OpenSSLで生成**:
```bash
openssl rand -hex 32
```

**設定例**:
```env
SESSION_SECRET=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3
```

**注意点**:
- 長いランダム文字列を使用してください（推奨: 64文字以上）
- **絶対に公開しないでください**
- 本番環境では、必ず新しいシークレットを生成してください

---

#### JWT_SECRET
**説明**: JWTトークンの署名に使用する秘密鍵

**生成方法**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**設定例**:
```env
JWT_SECRET=super-secret-jwt-key-change-this-in-production-1234567890abcdef
```

**注意点**:
- 長いランダム文字列を使用してください
- **絶対に公開しないでください**
- 本番環境では、必ず新しいシークレットを生成してください

---

### 5. サーバー設定

#### PORT
**説明**: バックエンドサーバーがリッスンするポート番号

**設定例**:
```env
PORT=3000
```

**注意点**:
- デフォルトは3000です
- 他のアプリケーションとポートが競合する場合は変更してください

---

#### NODE_ENV
**説明**: 実行環境（development/production）

**設定例**:
```env
# 開発環境
NODE_ENV=development

# 本番環境
NODE_ENV=production
```

**注意点**:
- `development`: 開発環境（詳細なエラーメッセージ、ホットリロード等）
- `production`: 本番環境（最適化、セキュリティ強化等）

---

#### FRONTEND_URL
**説明**: フロントエンドアプリケーションのURL

**設定例**:
```env
# 開発環境
FRONTEND_URL=http://localhost:5173

# 本番環境
FRONTEND_URL=https://yourdomain.com
```

**注意点**:
- CORS設定で使用されます
- 本番環境では、正確なドメインを設定してください

---

## フロントエンド環境変数

### VITE_API_URL
**説明**: バックエンドAPIのベースURL

**設定例**:
```env
# 開発環境
VITE_API_URL=http://localhost:3000/api

# 本番環境
VITE_API_URL=https://api.yourdomain.com/api
```

**注意点**:
- Viteでは、環境変数は`VITE_`プレフィックスが必要です
- フロントエンドからバックエンドへのAPIリクエストに使用されます

---

## 設定手順

### ステップ1: バックエンド環境変数の設定

1. **`.env.example`をコピー**:
```bash
cd backend
cp env.example .env
```

2. **`.env`ファイルを編集**:
```bash
# エディタで開く
code .env  # VS Codeの場合
# または
nano .env
# または
vim .env
```

3. **各環境変数を設定**:
   - 上記の説明に従って、各環境変数を設定してください
   - 特に重要なのは:
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_REDIRECT_URI`
     - `ENCRYPTION_KEY`（32文字）
     - `SESSION_SECRET`
     - `DATABASE_URL`

### ステップ2: フロントエンド環境変数の設定

1. **`.env.example`をコピー**:
```bash
cd frontend
cp env.example .env
```

2. **`.env`ファイルを編集**:
```bash
code .env  # VS Codeの場合
```

3. **`VITE_API_URL`を設定**:
```env
VITE_API_URL=http://localhost:3000/api
```

### ステップ3: Google Cloud Consoleの設定

1. **Google Cloud Consoleにアクセス**:
   - https://console.cloud.google.com/

2. **プロジェクトを作成または選択**

3. **Google Calendar APIを有効化**:
   - 「APIとサービス」→「ライブラリ」
   - 「Google Calendar API」を検索
   - 「有効にする」をクリック

4. **OAuth同意画面を設定**:
   - 「APIとサービス」→「OAuth同意画面」
   - ユーザータイプを選択（外部または内部）
   - アプリ情報を入力
   - スコープを追加:
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/calendar.events.freebusy`
   - テストユーザーを追加（開発中の場合）

5. **OAuth 2.0 クライアントIDを作成**:
   - 「認証情報」→「認証情報を作成」→「OAuth 2.0 クライアントID」
   - アプリケーションの種類: **Webアプリケーション**
   - 名前: "CalendarSync OS"
   - 承認済みのリダイレクトURI:
     - `http://localhost:3000/api/auth/google/callback`
   - 「作成」をクリック
   - クライアントIDとシークレットをコピーして`.env`に設定

### ステップ4: 環境変数の確認

**バックエンド**:
```bash
cd backend
node -e "require('dotenv').config(); console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '設定済み' : '未設定');"
```

**フロントエンド**:
```bash
cd frontend
# Viteは自動的に.envを読み込みます
```

### ステップ5: サーバーの再起動

環境変数を変更した後は、**必ずサーバーを再起動**してください:

```bash
# バックエンド
cd backend
# 実行中のサーバーを停止（Ctrl+C）
npm run dev

# フロントエンド
cd frontend
# 実行中のサーバーを停止（Ctrl+C）
npm run dev
```

---

## トラブルシューティング

### エラー: "Missing required OAuth environment variables"
**原因**: `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、または`GOOGLE_REDIRECT_URI`が設定されていない

**解決方法**:
1. `.env`ファイルが正しい場所にあるか確認（`backend/.env`）
2. 環境変数が正しく設定されているか確認
3. サーバーを再起動

### エラー: "ENCRYPTION_KEY must be exactly 32 characters long"
**原因**: `ENCRYPTION_KEY`が32文字ではない

**解決方法**:
```bash
# 32文字のキーを生成
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```
生成されたキーを`.env`に設定

### エラー: "redirect_uri_mismatch"
**原因**: Google Cloud Consoleで設定したリダイレクトURIと`.env`の`GOOGLE_REDIRECT_URI`が一致していない

**解決方法**:
1. Google Cloud Consoleの「承認済みのリダイレクトURI」を確認
2. `.env`の`GOOGLE_REDIRECT_URI`と完全に一致させる
3. プロトコル、ドメイン、パス、ポート番号まで正確に一致させる

### エラー: "invalid_client"
**原因**: `GOOGLE_CLIENT_ID`または`GOOGLE_CLIENT_SECRET`が間違っている

**解決方法**:
1. Google Cloud Consoleで正しい値を確認
2. `.env`ファイルに正しく設定されているか確認
3. 余分なスペースや改行がないか確認

---

## セキュリティチェックリスト

- [ ] `.env`ファイルが`.gitignore`に含まれている
- [ ] `.env`ファイルをGitにコミットしていない
- [ ] `ENCRYPTION_KEY`が32文字のランダム文字列
- [ ] `SESSION_SECRET`が長いランダム文字列
- [ ] `JWT_SECRET`が長いランダム文字列
- [ ] 本番環境では、すべてのシークレットを新しく生成
- [ ] Google Cloud ConsoleでOAuth同意画面を設定済み
- [ ] 承認済みのリダイレクトURIが正確に設定されている

---

## 参考リンク

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google OAuth 2.0 ドキュメント](https://developers.google.com/identity/protocols/oauth2)
- [Supabase ドキュメント](https://supabase.com/docs)
- [Node.js crypto モジュール](https://nodejs.org/api/crypto.html)
