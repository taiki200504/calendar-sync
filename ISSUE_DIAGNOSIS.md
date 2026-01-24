# 問題診断と対応方法

## 現在のエラー

### 1. React Error #418 と #423
**症状**: ブラウザコンソールに複数のReactエラーが表示される
- `react-i18next:: You will need to pass in an i18next instance by using initReactI18next`
- `Uncaught Error: Minified React error #418`
- `Uncaught Error: Minified React error #423`

**原因**:
- React error #418は**hydration mismatch**エラー（サーバーとクライアントのレンダリング不一致）
- React error #423は**invalid hook call**エラー（複数のReactインスタンスまたはフックの誤用）
- `react-i18next`の警告は、コードベースでは使用していないが、依存関係から間接的に読み込まれている可能性

**対応済み**:
- ✅ `vite.config.ts`に`dedupe`を追加（Reactの重複インスタンスを防ぐ）
- ✅ `optimizeDeps`と`build.rollupOptions`を追加（チャンク分割でReactを分離）

### 2. 404エラー（認証後）
**症状**: Google認証後に404エラーが発生する

**考えられる原因**:
1. **Vercelの環境変数`FRONTEND_URL`が正しく設定されていない**
   - バックエンドが`/auth/callback`にリダイレクトする際に、間違ったURLを使用している可能性
   
2. **リダイレクト先のURLが間違っている**
   - `.env.production`には`FRONTEND_URL=https://calendarsync.com`が設定されているが、Vercelの実際のドメインと一致していない可能性

3. **React Routerのルーティングが正しく動作していない**
   - `/auth/callback`ルートが正しく設定されているが、ビルド時に問題が発生している可能性

## 確認が必要な項目

### ✅ 確認済み
- Vercelの環境変数`FRONTEND_URL`と`GOOGLE_REDIRECT_URI`は設定されている
- `vercel.json`のリライト設定は正しい（`/(.*)` → `/index.html`）

### ❓ 確認が必要
1. **Vercelの環境変数の実際の値**
   - `FRONTEND_URL`がVercelの実際のドメインと一致しているか
   - 例: `https://calendar-sync-gyju9n4cx-taikimishimabiz-gmailcoms-projects.vercel.app`

2. **Google Cloud ConsoleのリダイレクトURI設定**
   - `GOOGLE_REDIRECT_URI`がGoogle Cloud Consoleに登録されているか
   - 例: `https://calendar-sync-gyju9n4cx-taikimishimabiz-gmailcoms-projects.vercel.app/api/auth/google/callback`

3. **ブラウザのコンソールログ**
   - 認証後のリダイレクト先URL
   - `/api/auth/me`のレスポンス

## 🔴 発見された問題

### 問題1: FRONTEND_URLが間違っている
- **現在の値**: `https://calendar-sync-os.vercel.app/`（末尾にスラッシュがある）
- **問題**: 末尾のスラッシュにより、リダイレクト先が`/auth/callback/`になってしまう可能性
- **正しい値**: `https://calendar-sync-os.vercel.app`（末尾のスラッシュなし）

### 問題2: GOOGLE_REDIRECT_URIが間違っている
- **現在の値**: `https://calendarsync.com/api/auth/google/callback`
- **問題**: 実際のVercelドメインと一致していない
- **正しい値**: `https://calendar-sync-os.vercel.app/api/auth/google/callback`

## 対応手順

### ステップ1: Vercelの環境変数を更新

```bash
# 現在のVercelのドメインを確認
vercel ls

# FRONTEND_URLを更新（末尾のスラッシュを削除）
vercel env rm FRONTEND_URL production
vercel env add FRONTEND_URL production
# 値: https://calendar-sync-os.vercel.app（末尾のスラッシュなし）

# GOOGLE_REDIRECT_URIを更新
vercel env rm GOOGLE_REDIRECT_URI production
vercel env add GOOGLE_REDIRECT_URI production
# 値: https://calendar-sync-os.vercel.app/api/auth/google/callback
```

### ステップ2: Google Cloud Consoleの設定を確認

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」を開く
4. OAuth 2.0 クライアントIDを選択
5. 「承認済みのリダイレクトURI」に以下を追加:
   - `https://calendar-sync-gyju9n4cx-taikimishimabiz-gmailcoms-projects.vercel.app/api/auth/google/callback`
   - （実際のVercelドメインに置き換える）

### ステップ3: 再デプロイ

```bash
# 変更をコミット
git add -A
git commit -m "Fix React errors and update Vite config"
git push

# Vercelに再デプロイ
vercel --prod --yes
```

### ステップ4: 動作確認

1. ブラウザでVercelのURLにアクセス
2. 「Googleでログイン」をクリック
3. 認証後に`/auth/callback`にリダイレクトされることを確認
4. ブラウザのコンソールでエラーが解消されているか確認

## 追加の対処（必要に応じて）

### react-i18nextの警告を消す

コードベースでは`react-i18next`を使用していないため、この警告は無視しても問題ありません。ただし、完全に消したい場合は：

```bash
# 依存関係を確認
cd frontend
npm ls react-i18next

# 間接的な依存関係を確認
npm ls | grep i18next
```

### React Error #418の詳細確認

開発環境でビルドして詳細なエラーメッセージを確認：

```bash
cd frontend
npm run build
npm run preview
```

## 次のステップ

1. ✅ Vite設定の更新（完了）
2. ⏳ Vercel環境変数の確認・更新
3. ⏳ Google Cloud Consoleの設定確認
4. ⏳ 再デプロイと動作確認
