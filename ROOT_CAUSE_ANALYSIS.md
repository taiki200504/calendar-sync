# 🔍 根本原因分析：getaddrinfo ENOTFOUND エラー

## 🔴 エラーの意味

```
getaddrinfo ENOTFOUND db.tthmjkltvrwlxtqanydk.supabase.co
```

このエラーは、**Vercel環境からSupabaseのホスト名を解決できない（DNS lookup失敗）**ことを示しています。

---

## 🎯 根本原因の可能性

### 可能性1: Vercel環境変数が設定されていない（最も可能性が高い）

**症状**: エラーメッセージに「Please check DATABASE_URL environment variable in Vercel」と表示される

**確認方法**: 以下を実行して確認

### 可能性2: 環境変数が設定されているが、値が間違っている

**症状**: 環境変数は存在するが、値が空または間違っている

### 可能性3: 環境変数を設定したが、再デプロイしていない

**症状**: 環境変数を追加/更新したが、古いデプロイメントが実行されている

### 可能性4: 環境変数のスコープが間違っている

**症状**: 環境変数が`Development`のみに設定されていて、`Production`に設定されていない

---

## 📋 ステップバイステップ確認手順

### ステップ1: Vercel環境変数の存在確認

#### 方法A: Vercel CLIから確認

```bash
# すべての環境変数を確認
vercel env ls

# DATABASE_URLのみ確認
vercel env ls | grep DATABASE_URL
```

**期待される出力**:
```
DATABASE_URL Encrypted Production, Preview, Development
```

**もし何も表示されない場合**: 環境変数が設定されていません。→ **ステップ2へ**

**もし表示される場合**: 環境変数は設定されています。→ **ステップ3へ**

---

### ステップ2: Vercel環境変数を設定

#### 方法A: Vercel Dashboardから設定（推奨）

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクト「CalendarSync OS」を選択
3. **Settings** → **Environment Variables** を開く
4. `DATABASE_URL` が存在するか確認
5. **存在しない場合**:
   - **Add New** をクリック
   - **Key**: `DATABASE_URL`
   - **Value**: `postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres`
   - **Environment**: 
     - ✅ `Production`（**必須**）
     - ✅ `Preview`（推奨）
     - ✅ `Development`（推奨）
   - **Save** をクリック

#### 方法B: Vercel CLIから設定

```bash
# Production環境に設定
vercel env add DATABASE_URL production

# プロンプトが表示されたら、以下を入力：
postgresql://postgres:KFQa5GhThOkOeYkk@db.tthmjkltvrwlxtqanydk.supabase.co:5432/postgres

# Preview環境にも設定（オプション）
vercel env add DATABASE_URL preview

# Development環境にも設定（オプション）
vercel env add DATABASE_URL development
```

---

### ステップ3: 環境変数の値の確認

**重要**: Vercel環境変数は暗号化されているため、値そのものは見れません。しかし、以下の方法で確認できます：

#### 方法A: テスト用のAPIエンドポイントを作成（一時的）

環境変数が正しく設定されているか確認するためのテストエンドポイントを作成します。

#### 方法B: Vercel Dashboardから確認

1. **Settings** → **Environment Variables**
2. `DATABASE_URL` をクリック
3. **Edit** をクリック
4. 値が正しいか確認（表示される場合は）

**注意**: Vercel環境変数は暗号化されているため、値が表示されない場合があります。

---

### ステップ4: 環境変数のスコープ確認

**重要**: 環境変数は、**各環境（Production、Preview、Development）ごとに設定する必要があります**。

#### 確認方法

```bash
vercel env ls | grep DATABASE_URL
```

**期待される出力**:
```
DATABASE_URL Encrypted Production, Preview, Development
```

**もし `Production` が含まれていない場合**: Production環境に設定されていません。→ **ステップ2でProduction環境に設定**

---

### ステップ5: 再デプロイの実行

**重要**: 環境変数を追加/更新した後、**必ず再デプロイが必要**です。

#### 方法A: Git pushで自動デプロイ（推奨）

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS"
git commit --allow-empty -m "Trigger redeploy after DATABASE_URL update"
git push
```

#### 方法B: Vercel Dashboardから再デプロイ

1. **Deployments** タブを開く
2. 最新のデプロイメントの **...** メニューをクリック
3. **Redeploy** を選択
4. **Use existing Build Cache** のチェックを**外す**（重要）
5. **Redeploy** をクリック

#### 方法C: Vercel CLIから再デプロイ

```bash
vercel --prod
```

---

### ステップ6: デプロイ後の確認

#### 1. デプロイが完了したか確認

Vercel Dashboardで、最新のデプロイメントが**成功**しているか確認

#### 2. 実行時ログを確認

```bash
# 最新のログを確認
vercel logs --follow
```

または、Vercel Dashboardの **Deployments** → **Functions** → **View Function Logs** から確認

#### 3. 認証をテスト

1. ブラウザで `https://calendar-sync-os.vercel.app` にアクセス
2. 「Googleでログイン」をクリック
3. エラーが解消されているか確認

---

## 🔧 トラブルシューティング

### 問題1: 環境変数が設定されているのにエラーが出る

**原因**: 再デプロイしていない可能性が高い

**解決方法**:
1. **必ず再デプロイを実行**
2. **Build Cacheをクリア**して再デプロイ
3. 実行時ログを確認して、実際に環境変数が読み込まれているか確認

### 問題2: Production環境に設定されていない

**症状**: `vercel env ls`で`Production`が表示されない

**解決方法**:
1. Vercel Dashboardから`DATABASE_URL`を編集
2. **Environment**で`Production`を選択
3. **Save**をクリック
4. 再デプロイ

### 問題3: 環境変数の値が間違っている

**症状**: 環境変数は存在するが、エラーが続く

**解決方法**:
1. Vercel Dashboardから`DATABASE_URL`を削除
2. 正しい値で再設定
3. 再デプロイ

---

## 📝 チェックリスト

以下の順番で確認してください：

- [ ] **ステップ1**: `vercel env ls | grep DATABASE_URL`で環境変数が存在するか確認
- [ ] **ステップ2**: 存在しない場合は、Vercel Dashboardから設定
- [ ] **ステップ3**: 環境変数のスコープを確認（`Production`が含まれているか）
- [ ] **ステップ4**: 環境変数を設定/更新した後、**必ず再デプロイ**
- [ ] **ステップ5**: デプロイが完了したか確認
- [ ] **ステップ6**: 実行時ログを確認
- [ ] **ステップ7**: 認証をテスト

---

## 🚀 最も可能性が高い解決方法

**環境変数を設定したが、再デプロイしていない**可能性が最も高いです。

以下の手順を**必ず実行**してください：

1. Vercel Dashboardで`DATABASE_URL`が`Production`環境に設定されているか確認
2. 設定されていない場合は設定
3. **必ず再デプロイ**（Build Cacheをクリア）
4. 実行時ログを確認
5. 認証をテスト

---

## 💡 デバッグのヒント

実行時ログで以下を確認してください：

- `DATABASE_URL`が読み込まれているか
- データベース接続を試みているか
- エラーメッセージの詳細

Vercel Dashboardの **Deployments** → **Functions** → **View Function Logs** から確認できます。
