# クイックOAuth設定ガイド

## 🚀 最も簡単な方法

### 方法1: 対話型セットアップスクリプト（推奨）

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS/backend"
node scripts/setup-oauth.js
```

このスクリプトが、Google OAuth認証情報の入力を案内し、自動的に`.env`ファイルを更新します。

---

### 方法2: 手動設定

1. **Google Cloud ConsoleでOAuth認証情報を取得**
   - [Google Cloud Console](https://console.cloud.google.com/)にアクセス
   - プロジェクトを作成/選択
   - 「APIとサービス」→「認証情報」→「OAuth 2.0 クライアントIDを作成」
   - クライアントIDとシークレットをコピー

2. **`.env`ファイルを編集**

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS/backend"
nano .env  # または code .env (VS Codeの場合)
```

以下の行を実際の値に置き換える:

```env
GOOGLE_CLIENT_ID=実際のクライアントID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=実際のクライアントシークレット
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

3. **設定を検証**

```bash
node scripts/validate-oauth.js
```

4. **Backendサーバーを再起動**

```bash
# 現在のプロセスを停止
pkill -f "tsx watch"

# 再起動
npm run dev
```

---

## 📋 Google Cloud Consoleでの設定手順（簡易版）

### 1. プロジェクトの作成/選択
- [Google Cloud Console](https://console.cloud.google.com/)にアクセス
- 新しいプロジェクトを作成するか、既存のプロジェクトを選択

### 2. Google Calendar APIを有効化
- 「APIとサービス」→「ライブラリ」
- 「Google Calendar API」を検索して「有効にする」

### 3. OAuth同意画面を設定
- 「APIとサービス」→「OAuth同意画面」
- ユーザータイプを選択（外部または内部）
- アプリ情報を入力
- スコープを追加:
  - `https://www.googleapis.com/auth/calendar.events`
  - `https://www.googleapis.com/auth/calendar.events.freebusy`
- **テストユーザーを追加（必須）**:
  - 「ユーザーを追加」をクリック
  - **使用するGoogleアカウントのメールアドレス**を入力
  - 「追加」をクリック
  - ⚠️ テストユーザーを追加しないと「エラー 403: access_denied」が発生します

### 4. OAuth 2.0 クライアントIDを作成
- 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuth 2.0 クライアントID」
- アプリケーションの種類: **Webアプリケーション**
- 名前: 任意（例: "CalendarSync OS"）
- **承認済みのリダイレクトURI**: `http://localhost:3000/api/auth/google/callback`
- 「作成」をクリック
- **クライアントID**と**クライアントシークレット**をコピー

---

## ✅ 設定確認

設定が完了したら、以下で確認:

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS/backend"
node scripts/validate-oauth.js
```

すべて✅が表示されればOKです。

---

## 🔄 Backendサーバーの再起動

環境変数を変更した後は、**必ずBackendサーバーを再起動**してください:

```bash
# プロセスを停止
pkill -f "tsx watch"

# 再起動
cd "/Users/taikimishima/Developer/CalendarSync OS/backend"
npm run dev
```

---

## 🧪 動作確認

1. ブラウザで `http://localhost:5173` にアクセス
2. 「Googleでログイン」をクリック
3. Googleアカウントで認証
4. ダッシュボードが表示されれば成功！

---

## ❓ トラブルシューティング

### エラー: "invalid_client"
- `GOOGLE_CLIENT_ID`と`GOOGLE_CLIENT_SECRET`が正しいか確認
- サーバーを再起動したか確認

### エラー: "redirect_uri_mismatch"
- Google Cloud Consoleの「承認済みのリダイレクトURI」と`.env`の`GOOGLE_REDIRECT_URI`が完全に一致しているか確認
- プロトコル（`http://`）、ドメイン、ポート、パスまで正確に一致させる

### エラー: "access_denied" または "403: access_denied"
**原因**: OAuth同意画面がテストモードで、使用しているGoogleアカウントがテストユーザーに追加されていない

**解決方法**:
1. Google Cloud Console → 「APIとサービス」→「OAuth同意画面」
2. 「テストユーザー」セクションで「ユーザーを追加」
3. **使用するGoogleアカウントのメールアドレス**を入力
4. 「追加」をクリックして保存
5. ブラウザのキャッシュをクリアして再度ログイン

詳細は `OAUTH_ACCESS_DENIED_FIX.md` を参照してください。

---

## 📚 詳細な手順

より詳細な手順が必要な場合は、`OAUTH_SETUP_GUIDE.md`を参照してください。
