# 🔧 修正手順

## 問題の原因

1. **React Error #418/#423**: 複数のReactインスタンスまたはhydration mismatch
2. **404エラー**: Vercelの環境変数`FRONTEND_URL`と`GOOGLE_REDIRECT_URI`が間違っている

## ✅ 既に実施済みの修正

1. `frontend/vite.config.ts`に以下を追加:
   - `dedupe: ['react', 'react-dom']` - Reactの重複インスタンスを防ぐ
   - `optimizeDeps` - 依存関係の最適化
   - `build.rollupOptions` - チャンク分割でReactを分離

## 🔴 あなたが実施する必要があること

### ステップ1: Vercelの環境変数を確認 ✅

環境変数は既に正しい値に設定されています：
- ✅ `FRONTEND_URL="https://calendar-sync-os.vercel.app"`（末尾のスラッシュなし）
- ✅ `GOOGLE_REDIRECT_URI="https://calendar-sync-os.vercel.app/api/auth/google/callback"`

**確認済み** - 追加の作業は不要です。

### ステップ2: Google Cloud Consoleの設定を確認

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」を開く
4. OAuth 2.0 クライアントIDを選択
5. 「承認済みのリダイレクトURI」に以下が追加されているか確認:
   - `https://calendar-sync-os.vercel.app/api/auth/google/callback`
   - もし追加されていない場合は追加してください

### ステップ3: 再デプロイ

環境変数を更新した後、Vercelに再デプロイします：

```bash
# 変更をコミット（既に実施済み）
git add -A
git commit -m "Fix React errors: Add dedupe and optimizeDeps to vite config"
git push

# Vercelに再デプロイ
vercel --prod --yes
```

### ステップ4: 動作確認

1. ブラウザで `https://calendar-sync-os.vercel.app` にアクセス
2. 「Googleでログイン」をクリック
3. Google認証を完了
4. `/auth/callback`にリダイレクトされ、その後`/dashboard`に遷移することを確認
5. ブラウザのコンソール（F12）でエラーが解消されているか確認

## トラブルシューティング

### まだ404エラーが出る場合

1. **環境変数が正しく設定されているか確認**:
   ```bash
   vercel env ls | grep -E "FRONTEND_URL|GOOGLE_REDIRECT_URI"
   ```

2. **実際のVercelドメインを確認**:
   ```bash
   vercel ls
   ```
   表示されたドメインが`calendar-sync-os.vercel.app`と異なる場合は、そのドメインに合わせて環境変数を更新してください

3. **ブラウザのコンソールでリダイレクト先URLを確認**:
   - 認証後にどのURLにリダイレクトされているか確認
   - `FRONTEND_URL`の値と一致しているか確認

### Reactエラーがまだ出る場合

1. **ブラウザのキャッシュをクリア**:
   - Chrome/Edge: `Ctrl+Shift+Delete` (Windows) または `Cmd+Shift+Delete` (Mac)
   - 「キャッシュされた画像とファイル」を選択して削除

2. **ハードリロード**:
   - `Ctrl+Shift+R` (Windows) または `Cmd+Shift+R` (Mac)

3. **開発環境で確認**:
   ```bash
   cd frontend
   npm run build
   npm run preview
   ```
   ローカルでビルドして、エラーが再現するか確認

## 確認事項チェックリスト

- [ ] Vercelの環境変数`FRONTEND_URL`を更新（末尾のスラッシュなし）
- [ ] Vercelの環境変数`GOOGLE_REDIRECT_URI`を更新（実際のVercelドメインに合わせる）
- [ ] Google Cloud Consoleの「承認済みのリダイレクトURI」に正しいURLを追加
- [ ] 変更をコミット・プッシュ
- [ ] Vercelに再デプロイ
- [ ] ブラウザで動作確認
- [ ] コンソールでエラーが解消されているか確認
