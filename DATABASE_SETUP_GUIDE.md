# 🗄️ データベース設定ガイド

## 📋 概要

このガイドでは、CalendarSync OSのデータベース設定方法を説明します。

## 🔧 データベースの選択

### 1. Supabase（推奨）

**メリット**:
- 無料プランあり
- 自動バックアップ
- ダッシュボードで管理が簡単
- SSL接続が標準

**セットアップ手順**:

1. [Supabase](https://supabase.com/)でアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクト設定から「Database」→「Connection string」を開く
4. 「URI」をコピー（パスワードを入力して表示）

**接続文字列の形式**:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 2. 自前のPostgreSQL

**接続文字列の形式**:
```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

例:
```
postgresql://postgres:mypassword@localhost:5432/calendar_sync
```

## 📝 環境変数の設定

### 方法1: `.env.production`ファイルを使用（ローカル開発・マイグレーション実行時）

1. プロジェクトルートの`.env.production`ファイルを編集：

```bash
# .env.production
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```

2. 環境変数を読み込んでマイグレーションを実行：

```bash
# ルートディレクトリから
cd backend

# 環境変数を読み込む（.env.productionから）
export $(cat ../.env.production | grep -v '^#' | xargs)

# または、dotenv-cliを使用
npm install -g dotenv-cli
dotenv -e ../.env.production -- npm run migrate:up
```

### 方法2: 環境変数を直接設定

```bash
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
cd backend
npm run migrate:up
```

### 方法3: `.env`ファイルを作成（backendディレクトリ内）

```bash
cd backend
cp env.example .env
# .envファイルを編集してDATABASE_URLを設定
npm run migrate:up
```

## 🚀 マイグレーションの実行

### 方法1: スクリプトを使用（推奨・最も簡単）

```bash
# プロジェクトルートディレクトリから実行
./scripts/run-migration.sh up
```

このスクリプトは自動的に`.env.production`から環境変数を読み込みます。

### 方法2: 環境変数を直接設定

```bash
cd backend

# 環境変数を設定
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"

# マイグレーションを実行
npm run migrate:up
```

### 方法3: dotenv-cliを使用

```bash
# dotenv-cliをインストール（初回のみ）
npm install -g dotenv-cli

# マイグレーションを実行
cd backend
dotenv -e ../.env.production -- npm run migrate:up
```

### 方法4: backendディレクトリに.envファイルを作成

```bash
cd backend
echo "DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres" > .env
npm run migrate:up
```

### マイグレーション状態の確認

```bash
cd backend
npm run check-migration
```

### マイグレーションのロールバック（必要に応じて）

```bash
cd backend
npm run migrate:down
```

## 🔍 トラブルシューティング

### エラー: `getaddrinfo ENOTFOUND base`

**原因**: `DATABASE_URL`が正しく読み込まれていない、または形式が間違っている

**解決方法**:

1. **環境変数が正しく設定されているか確認**:
   ```bash
   echo $DATABASE_URL
   ```

2. **`.env.production`ファイルの内容を確認**:
   ```bash
   cat .env.production | grep DATABASE_URL
   ```

3. **接続文字列の形式を確認**:
   - `postgresql://`で始まっているか
   - ホスト名が正しいか（Supabaseの場合は`db.[project-ref].supabase.co`）
   - ポート番号が正しいか（通常は`5432`）
   - パスワードに特殊文字が含まれている場合はURLエンコードが必要

4. **環境変数を明示的に設定して実行**:
   ```bash
   cd backend
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres" npm run migrate:up
   ```

### エラー: `password authentication failed`

**原因**: パスワードが間違っている

**解決方法**:
- Supabaseの場合は、プロジェクト設定からパスワードを確認
- パスワードに特殊文字が含まれている場合は、URLエンコードが必要（例: `@` → `%40`）

### エラー: `SSL connection required`

**原因**: SupabaseはSSL接続が必須

**解決方法**:
- `DATABASE_URL`の末尾に`?sslmode=require`を追加（通常は不要ですが、必要に応じて）
- アプリケーションコードでは自動的にSSL設定が適用されます

### 環境変数が読み込まれない

**解決方法**:

1. **`dotenv-cli`を使用**:
   ```bash
   npm install -g dotenv-cli
   cd backend
   dotenv -e ../.env.production -- npm run migrate:up
   ```

2. **`backend`ディレクトリに`.env`ファイルを作成**:
   ```bash
   cd backend
   echo "DATABASE_URL=your-database-url" > .env
   npm run migrate:up
   ```

3. **環境変数を直接指定**:
   ```bash
   cd backend
   DATABASE_URL="your-database-url" npm run migrate:up
   ```

## 📚 Supabaseでのデータベース作成手順

1. [Supabase](https://supabase.com/)にログイン
2. 「New Project」をクリック
3. プロジェクト情報を入力：
   - **Name**: プロジェクト名
   - **Database Password**: 強力なパスワードを設定（後で使用します）
   - **Region**: 最寄りのリージョンを選択
4. プロジェクトが作成されるまで待機（数分かかります）
5. プロジェクトダッシュボードで「Settings」→「Database」を開く
6. 「Connection string」セクションで「URI」を選択
7. パスワードを入力して接続文字列を表示
8. 接続文字列をコピーして`.env.production`に設定

## 🔐 セキュリティのベストプラクティス

1. **パスワードの管理**:
   - `.env.production`ファイルをGitにコミットしない（`.gitignore`に追加済み）
   - 本番環境では環境変数として設定

2. **接続文字列の形式**:
   - パスワードに特殊文字が含まれている場合はURLエンコード
   - 例: `@` → `%40`, `#` → `%23`

3. **アクセス制限**:
   - Supabaseの場合は、IPアドレス制限を設定可能
   - 本番環境では適切なファイアウォール設定を推奨

## 📝 チェックリスト

マイグレーション実行前の確認事項:

- [ ] Supabaseプロジェクトが作成されている（またはPostgreSQLサーバーが起動している）
- [ ] `DATABASE_URL`が正しく設定されている
- [ ] 接続文字列の形式が正しい（`postgresql://...`）
- [ ] パスワードが正しい
- [ ] ネットワーク接続が可能（Supabaseの場合はインターネット接続が必要）
- [ ] 環境変数が正しく読み込まれている（`echo $DATABASE_URL`で確認）

## 🎯 次のステップ

マイグレーションが成功したら：

1. データベースの状態を確認:
   ```bash
   cd backend
   npm run check-migration
   ```

2. アプリケーションを起動して動作確認:
   ```bash
   npm run dev
   ```

3. Vercelにデプロイする場合は、Vercelダッシュボードで`DATABASE_URL`環境変数を設定
