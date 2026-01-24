# ✅ Vercelデプロイ後の手順チェックリスト

## 🎯 デプロイが完了したら、以下の手順を順番に実行してください

---

## 📋 ステップ1: デプロイの成功確認（2分）

### 1-1. Vercelダッシュボードで確認

1. [Vercelダッシュボード](https://vercel.com/dashboard)にアクセス
2. プロジェクトを開く
3. 「Deployments」タブで最新のデプロイが**成功**しているか確認
   - ✅ 緑色のチェックマーク = 成功
   - ❌ 赤色のエラー = 失敗（ログを確認）

### 1-2. デプロイされたURLを確認

デプロイが成功すると、Vercelが自動的にドメインを割り当てます。

**例:**
```
https://your-project.vercel.app
```

このURLをメモしておいてください。次のステップで使用します。

---

## 🔄 ステップ2: 環境変数の更新（5分）

デプロイが完了してドメインが確定したら、以下の環境変数を更新する必要があります。

### 2-1. Vercelダッシュボードで環境変数を更新

1. Vercelダッシュボードでプロジェクトを開く
2. 「Settings」タブをクリック
3. 「Environment Variables」をクリック
4. 以下の2つの環境変数を更新：

#### ① `GOOGLE_REDIRECT_URI` を更新

- **変数名**: `GOOGLE_REDIRECT_URI`
- **新しい値**: `https://your-project.vercel.app/api/auth/google/callback`
  （実際のVercelドメインに置き換え）

#### ② `FRONTEND_URL` を更新

- **変数名**: `FRONTEND_URL`
- **新しい値**: `https://your-project.vercel.app`
  （実際のVercelドメインに置き換え）

### 2-2. 環境変数の適用範囲を確認

環境変数を追加/編集する際は、以下の環境にチェックを入れてください：
- ✅ **Production**（本番環境）
- ✅ **Preview**（プレビュー環境）
- ✅ **Development**（開発環境）

### 2-3. 再デプロイを実行

**重要**: 環境変数を変更した後は、**必ず再デプロイ**が必要です。

#### 方法A: Vercelダッシュボードから

1. 「Deployments」タブを開く
2. 最新のデプロイの「...」メニューをクリック
3. 「Redeploy」をクリック

#### 方法B: Vercel CLIから

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS"
vercel --prod
```

#### 方法C: GitHub連携の場合

コードをプッシュすると自動的に再デプロイされます：

```bash
git commit --allow-empty -m "Trigger redeploy"
git push
```

---

## 🔐 ステップ3: Google OAuth設定の更新（5分）

Vercelのドメインが確定したら、Google Cloud Consoleの設定も更新します。

### 3-1. Google Cloud Consoleにアクセス

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択

### 3-2. OAuth 2.0 クライアントIDを編集

1. 左メニューから「APIとサービス」→「認証情報」をクリック
2. OAuth 2.0 クライアントIDをクリック
3. 「承認済みのリダイレクトURI」セクションを確認

### 3-3. リダイレクトURIを追加

「URIを追加」をクリックして、以下を追加：

```
https://your-project.vercel.app/api/auth/google/callback
```

（実際のVercelドメインに置き換え）

### 3-4. 保存

「保存」ボタンをクリック

**注意**: 既存のリダイレクトURI（例: `https://calendarsync.com/api/auth/google/callback`）は削除せず、新しいURIを追加してください。

---

## ✅ ステップ4: 動作確認（5分）

### 4-1. ヘルスチェック

ブラウザまたはcurlで以下にアクセス：

```
https://your-project.vercel.app/health
```

**期待されるレスポンス:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-24T..."
}
```

✅ このレスポンスが返ってくれば、バックエンドは正常に動作しています。

### 4-2. フロントエンドの表示確認

1. `https://your-project.vercel.app` にアクセス
2. フロントエンドが正常に表示されるか確認
3. エラーメッセージが表示されていないか確認

### 4-3. OAuth認証のテスト

1. 「Googleでログイン」ボタンをクリック
2. Google認証画面が表示されるか確認
3. Googleアカウントでログイン
4. 認証が成功してダッシュボードにリダイレクトされるか確認

**問題がある場合:**
- `GOOGLE_REDIRECT_URI`が正しく設定されているか確認
- Google Cloud ConsoleでリダイレクトURIが登録されているか確認
- ブラウザのコンソールでエラーを確認

### 4-4. ログの確認

Vercelダッシュボードでログを確認：

1. プロジェクトの「Functions」タブを開く
2. APIリクエストのログを確認
3. エラーがないか確認

---

## 🔍 ステップ5: トラブルシューティング（必要に応じて）

### 問題1: ヘルスチェックが失敗する

**確認事項:**
- デプロイが成功しているか確認
- Vercelダッシュボードでエラーログを確認
- 環境変数が正しく設定されているか確認

### 問題2: OAuth認証が失敗する

**確認事項:**
1. `GOOGLE_REDIRECT_URI`がVercelのドメインと一致しているか
   ```
   https://your-project.vercel.app/api/auth/google/callback
   ```

2. Google Cloud ConsoleでリダイレクトURIが登録されているか
   - [Google Cloud Console](https://console.cloud.google.com/)で確認

3. `FRONTEND_URL`と`GOOGLE_REDIRECT_URI`のドメインが一致しているか
   - 両方とも `https://your-project.vercel.app` である必要があります

4. 環境変数を変更した後、再デプロイを実行したか

### 問題3: 環境変数が読み込まれない

**確認事項:**
- Vercelダッシュボードで環境変数が正しく設定されているか
- 環境変数は**Production**、**Preview**、**Development**の各環境で設定が必要
- 環境変数を変更した後、**再デプロイ**を実行したか

### 問題4: Redis接続エラー

**確認事項:**
- `REDIS_URL`が正しく設定されているか
- Upstash Redisの接続情報が正しいか
- UpstashダッシュボードでRedis Databaseが起動しているか

---

## 📝 完了チェックリスト

デプロイ後の作業が完了したら、以下を確認してください：

- [ ] デプロイが成功している
- [ ] Vercelのドメインを確認した
- [ ] `GOOGLE_REDIRECT_URI`を更新した
- [ ] `FRONTEND_URL`を更新した
- [ ] 再デプロイを実行した
- [ ] Google Cloud ConsoleでリダイレクトURIを追加した
- [ ] ヘルスチェックが成功する
- [ ] フロントエンドが正常に表示される
- [ ] OAuth認証が正常に動作する
- [ ] ログにエラーがない

---

## 🎉 完了！

すべてのチェック項目が完了したら、アプリケーションは正常に動作しています！

### 次のステップ

- カスタムドメインの設定（オプション）
- パフォーマンスの監視
- 定期的なログの確認

---

## 📚 参考ドキュメント

- [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md) - 環境変数設定の詳細ガイド
- [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) - Vercelデプロイの詳細ガイド
- [VERCEL_QUICK_START_JA.md](./VERCEL_QUICK_START_JA.md) - クイックスタートガイド

---

**問題が発生した場合は、トラブルシューティングセクションを参照してください！** 🆘
