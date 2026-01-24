# 🔧 ステップバイステップ修正手順

## 🎯 目標

`getaddrinfo ENOTFOUND db.tthmjkltvrwlxtqanydk.supabase.co` エラーを完全に解消する

---

## 📋 ステップ1: Vercel環境変数の存在確認

### コマンドを実行

```bash
vercel env ls | grep DATABASE_URL
```

### 結果の確認

#### ✅ ケースA: 環境変数が存在する

```
DATABASE_URL Encrypted Production, Preview, Development
```

→ **ステップ2へ**

#### ❌ ケースB: 何も表示されない

環境変数が設定されていません。

→ **ステップ3へ**

---

## 📋 ステップ2: 環境変数のスコープ確認

### 確認項目

出力に `Production` が含まれているか確認

#### ✅ ケースA: `Production` が含まれている

```
DATABASE_URL Encrypted Production, Preview, Development
```

→ **ステップ4へ**

#### ❌ ケースB: `Production` が含まれていない

例：
```
DATABASE_URL Encrypted Preview, Development
```

**問題**: Production環境に設定されていません。

→ **ステップ3でProduction環境に設定**

---

## 📋 ステップ3: Vercel環境変数を設定

### 方法A: Vercel Dashboardから設定（推奨）

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクト「CalendarSync OS」を選択
3. **Settings** → **Environment Variables** を開く
4. `DATABASE_URL` を検索
5. **存在しない場合**:
   - **Add New** をクリック
   - **Key**: `DATABASE_URL`
   - **Value**: `postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres`
   - **Environment**: 
     - ✅ `Production`（**必須**）
     - ✅ `Preview`（推奨）
     - ✅ `Development`（推奨）
   - **Save** をクリック
6. **既に存在する場合**:
   - `DATABASE_URL` をクリック
   - **Edit** をクリック
   - **Environment** で `Production` が選択されているか確認
   - 選択されていない場合は選択
   - **Value** が正しいか確認
   - **Save** をクリック

### 方法B: Vercel CLIから設定

```bash
# Production環境に設定
vercel env add DATABASE_URL production

# プロンプトが表示されたら、以下を入力：
postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres
```

---

## 📋 ステップ4: 再デプロイ（重要）

**重要**: 環境変数を追加/更新した後、**必ず再デプロイ**が必要です。

### 方法A: Git pushで自動デプロイ（推奨）

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS"
git commit --allow-empty -m "Trigger redeploy after DATABASE_URL update"
git push
```

### 方法B: Vercel Dashboardから再デプロイ

1. **Deployments** タブを開く
2. 最新のデプロイメントの **...** メニューをクリック
3. **Redeploy** を選択
4. **Use existing Build Cache** のチェックを**外す**（重要）
5. **Redeploy** をクリック

### 方法C: Vercel CLIから再デプロイ

```bash
vercel --prod
```

---

## 📋 ステップ5: デプロイの完了を確認

### 確認方法

1. Vercel Dashboardの **Deployments** タブを開く
2. 最新のデプロイメントのステータスを確認
3. **Ready** と表示されれば成功

---

## 📋 ステップ6: 実行時ログを確認

### 方法A: Vercel Dashboardから確認

1. **Deployments** タブを開く
2. 最新のデプロイメントをクリック
3. **Functions** タブを開く
4. `/api/index` または `/api/auth/google` をクリック
5. **View Function Logs** をクリック
6. 以下のログを探す：
   - `DATABASE_URL status` - 環境変数が読み込まれているか
   - `OAuth request started` - リクエストが開始されたか
   - `Failed to save OAuth state to database` - エラーの詳細

### 方法B: Vercel CLIから確認

```bash
vercel logs --follow
```

---

## 📋 ステップ7: 認証をテスト

1. ブラウザで `https://calendar-sync-os.vercel.app` にアクセス
2. **F12** で開発者ツールを開く
3. **Network** タブを開く
4. 「Googleでログイン」をクリック
5. エラーが発生しているリクエストをクリック
6. **Response** タブでエラーメッセージを確認

---

## 🔍 デバッグ情報の確認

デバッグログを追加したので、以下の情報がログに記録されます：

- `DATABASE_URL`が設定されているか
- `DATABASE_URL`の長さ
- `DATABASE_URL`のプレフィックス（最初の30文字）
- Vercel環境かどうか

これらの情報から、環境変数が正しく読み込まれているか確認できます。

---

## ⚠️ よくある間違い

### 間違い1: 環境変数を設定したが、再デプロイしていない

**症状**: 環境変数は設定されているが、エラーが続く

**解決方法**: **必ず再デプロイを実行**

### 間違い2: Preview環境にのみ設定している

**症状**: ローカルでは動作するが、本番環境でエラーが出る

**解決方法**: **Production環境にも設定**

### 間違い3: 環境変数の値が間違っている

**症状**: 環境変数は存在するが、エラーが続く

**解決方法**: 値を確認して、正しい値に更新

---

## 📝 チェックリスト

以下の順番で**必ず**確認してください：

- [ ] **ステップ1**: `vercel env ls | grep DATABASE_URL`で環境変数が存在するか確認
- [ ] **ステップ2**: 環境変数のスコープを確認（`Production`が含まれているか）
- [ ] **ステップ3**: 環境変数を設定/更新
- [ ] **ステップ4**: **必ず再デプロイ**（Build Cacheをクリア）
- [ ] **ステップ5**: デプロイが完了したか確認
- [ ] **ステップ6**: 実行時ログを確認（`DATABASE_URL status`を探す）
- [ ] **ステップ7**: 認証をテスト

---

## 🚀 最も重要なポイント

**環境変数を設定した後、必ず再デプロイを実行してください。**

再デプロイしないと、古いデプロイメントが実行され続け、環境変数が読み込まれません。

---

## 💡 デバッグのヒント

実行時ログで以下を確認してください：

- `DATABASE_URL status` ログに `isSet: true` と表示されているか
- `OAuth request started` ログに `hasDatabaseUrl: true` と表示されているか

これらのログから、環境変数が正しく読み込まれているか確認できます。
