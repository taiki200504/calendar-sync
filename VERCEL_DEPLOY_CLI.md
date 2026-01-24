# 🚀 Vercel CLI から直接デプロイする方法

## 📋 手順

### 1. Vercel CLIにログイン

```bash
vercel login
```

ブラウザが開き、Vercelアカウントでログインします。

### 2. プロジェクトをリンク（初回のみ）

```bash
cd "/Users/taikimishima/Developer/CalendarSync OS"
vercel link
```

既存のプロジェクトを選択するか、新規プロジェクトを作成します。

### 3. 本番環境にデプロイ

```bash
vercel --prod
```

または、確認なしでデプロイする場合：

```bash
vercel --prod --yes
```

## 🔍 トラブルシューティング

### ログインエラー

```bash
# ログアウトしてから再ログイン
vercel logout
vercel login
```

### プロジェクトがリンクされていない

```bash
# プロジェクトをリンク
vercel link

# または、新規プロジェクトとしてデプロイ
vercel --prod
```

## 📝 注意事項

- Vercel CLIからデプロイすると、現在のローカルコードが直接デプロイされます
- GitHub連携がある場合、Vercel CLIのデプロイとGitHub連携のデプロイが競合する可能性があります
- 環境変数はVercelダッシュボードで設定されているものが使用されます

## 🎯 クイックコマンド

```bash
# 1. ログイン
vercel login

# 2. 本番環境にデプロイ
vercel --prod --yes
```
