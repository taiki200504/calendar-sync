# Google OAuth 2.0 設定ガイド

## 🔴 現在のエラー

```
エラー 401: invalid_client
The OAuth client was not found.
```

このエラーは、`GOOGLE_CLIENT_ID`がプレースホルダー（`your-google-client-id`）のままで、実際のGoogle OAuth認証情報が設定されていないために発生しています。

---

## 📋 解決手順

### ステップ1: Google Cloud Consoleでプロジェクトを作成/選択

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 既存のプロジェクトを選択するか、新しいプロジェクトを作成
   - プロジェクト名: 任意（例: "CalendarSync OS"）

---

### ステップ2: Google Calendar APIを有効化

1. 左メニューから「**APIとサービス**」→「**ライブラリ**」を選択
2. 検索バーで「**Google Calendar API**」を検索
3. 「**Google Calendar API**」をクリック
4. 「**有効にする**」ボタンをクリック

---

### ステップ3: OAuth同意画面を設定

1. 左メニューから「**APIとサービス**」→「**OAuth同意画面**」を選択
2. **ユーザータイプ**を選択:
   - **外部**（一般ユーザー向け）または**内部**（組織内のみ）
3. 「**作成**」をクリック
4. **アプリ情報**を入力:
   - アプリ名: `CalendarSync OS`（任意）
   - ユーザーサポートメール: あなたのメールアドレス
   - デベロッパーの連絡先情報: あなたのメールアドレス
5. 「**保存して次へ**」をクリック
6. **スコープ**を追加:
   - 「**スコープを追加または削除**」をクリック
   - 以下のスコープを追加:
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/calendar.events.freebusy`
   - 「**更新**」→「**保存して次へ**」をクリック
7. **テストユーザー**を追加（開発中の場合）:
   - 「**ユーザーを追加**」をクリック
   - **重要**: 使用するGoogleアカウントのメールアドレスを入力
   - 「**追加**」をクリック
   - 複数のアカウントでテストする場合は、それぞれ追加
8. 「**保存して次へ**」をクリック
9. 確認画面で「**ダッシュボードに戻る**」をクリック

**⚠️ 重要**: テストユーザーを追加しないと、「エラー 403: access_denied」が発生します。
詳細は `OAUTH_ACCESS_DENIED_FIX.md` を参照してください。

---

### ステップ4: OAuth 2.0 クライアントIDを作成

1. 左メニューから「**APIとサービス**」→「**認証情報**」を選択
2. 上部の「**認証情報を作成**」をクリック
3. 「**OAuth 2.0 クライアントID**」を選択
4. **アプリケーションの種類**を選択:
   - 「**Webアプリケーション**」を選択
5. **名前**を入力:
   - 例: `CalendarSync OS - Local Development`
6. **承認済みのリダイレクトURI**を追加:
   - 「**URIを追加**」をクリック
   - 以下を入力:
     ```
     http://localhost:3000/api/auth/google/callback
     ```
   - **重要**: プロトコル（`http://`）、ドメイン（`localhost`）、ポート（`3000`）、パス（`/api/auth/google/callback`）まで正確に入力してください
7. 「**作成**」をクリック
8. **クライアントID**と**クライアントシークレット**が表示されます
   - **必ずコピーして保存してください**（特にシークレットは再表示できません）

---

### ステップ5: 環境変数を設定

1. `backend/.env`ファイルを開く
2. 以下の値を実際の値に置き換える:

```env
# Google OAuth 2.0（実際の値に置き換える）
GOOGLE_CLIENT_ID=実際のクライアントID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=実際のクライアントシークレット
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

**例**:
```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz123456
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

---

### ステップ6: Backendサーバーを再起動

環境変数を変更した後は、**必ずBackendサーバーを再起動**してください。

```bash
# 現在のBackendプロセスを停止
pkill -f "tsx watch"

# Backendを再起動
cd "/Users/taikimishima/Developer/CalendarSync OS/backend"
npm run dev
```

---

### ステップ7: 動作確認

1. ブラウザで `http://localhost:5173` にアクセス
2. 「**Googleでログイン**」をクリック
3. Googleアカウントで認証
4. ダッシュボードが表示されれば成功

---

## ⚠️ よくある問題

### 問題1: "redirect_uri_mismatch"

**原因**: Google Cloud Consoleで設定したリダイレクトURIと`.env`の`GOOGLE_REDIRECT_URI`が一致していない

**解決方法**:
1. Google Cloud Consoleの「承認済みのリダイレクトURI」を確認
2. `.env`の`GOOGLE_REDIRECT_URI`と**完全に一致**させる
3. プロトコル、ドメイン、パス、ポート番号まで正確に一致させる
4. 末尾のスラッシュ（`/`）の有無も一致させる

### 問題2: "invalid_client"

**原因**: `GOOGLE_CLIENT_ID`または`GOOGLE_CLIENT_SECRET`が間違っている

**解決方法**:
1. Google Cloud Consoleで正しい値を確認
2. `.env`ファイルに正しく設定されているか確認
3. 余分なスペースや改行がないか確認
4. サーバーを再起動

### 問題3: "access_denied"

**原因**: テストユーザーが追加されていない、またはOAuth同意画面が未設定

**解決方法**:
1. OAuth同意画面でテストユーザーを追加
2. 使用するGoogleアカウントがテストユーザーに含まれているか確認

---

## 🔍 設定確認方法

以下のコマンドで環境変数が正しく設定されているか確認できます:

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS/backend"
node scripts/check-env.js
```

`GOOGLE_CLIENT_ID`が`your-google-client-id`ではなく、実際のクライアントID（`.apps.googleusercontent.com`で終わる）が表示されていればOKです。

---

## 📚 参考リンク

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google OAuth 2.0 ドキュメント](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API ドキュメント](https://developers.google.com/calendar/api)

---

## ✅ チェックリスト

- [ ] Google Cloud Consoleでプロジェクトを作成/選択
- [ ] Google Calendar APIを有効化
- [ ] OAuth同意画面を設定
- [ ] 必要なスコープを追加
- [ ] テストユーザーを追加（開発中の場合）
- [ ] OAuth 2.0 クライアントIDを作成
- [ ] 承認済みのリダイレクトURIを設定
- [ ] クライアントIDとシークレットをコピー
- [ ] `backend/.env`ファイルに実際の値を設定
- [ ] Backendサーバーを再起動
- [ ] ブラウザでログインを試す

すべて完了したら、再度ログインを試してください！
