# 🚀 デプロイガイド

## ⚠️ 重要な注意事項

**デプロイの重複を防ぐため、以下のいずれか一方のみを使用してください：**

### 方法1: Git pushのみ（推奨）

Git pushすると、Vercelが自動的にデプロイを開始します。

```bash
# 変更をコミットしてプッシュ
git add -A
git commit -m "Your commit message"
git push
```

**✅ メリット**:
- 自動的にデプロイされる
- デプロイ履歴がGit履歴と連動する
- 手動操作が不要

**❌ 注意**: `vercel --prod`を手動で実行する必要はありません。

---

### 方法2: Vercel CLIのみ

Git pushせずに、Vercel CLIで直接デプロイします。

```bash
vercel --prod --yes
```

**✅ メリット**:
- ローカルの変更を直接デプロイできる
- Gitにコミットせずにテストできる

**❌ 注意**: Git pushは行いません。コードはGitに保存されません。

---

## 🛠️ デプロイスクリプトの使用

デプロイスクリプトを使用すると、重複を防げます：

```bash
# 自動モード（推奨）- Git pushのみ
./scripts/deploy.sh

# または明示的に指定
./scripts/deploy.sh auto  # Git pushのみ（推奨）
./scripts/deploy.sh git    # Git pushのみ
./scripts/deploy.sh vercel # Vercel CLIのみ（Git pushしない）
```

---

## 🔄 デプロイフロー

### 推奨フロー

```
1. コードを変更
   ↓
2. git add -A
   ↓
3. git commit -m "メッセージ"
   ↓
4. git push
   ↓
5. Vercelが自動的にデプロイ開始
   ↓
6. 完了（vercel --prod は不要）
```

### ❌ 避けるべきフロー

```
1. git push
   ↓
2. vercel --prod  ← これは不要！重複デプロイになる
```

---

## 📋 デプロイ後の確認

### 1. デプロイ状況の確認

```bash
# Vercelダッシュボードで確認
https://vercel.com/dashboard
```

### 2. ヘルスチェック

```bash
curl https://calendar-sync-os.vercel.app/api/health
```

### 3. 動作確認

1. ブラウザで `https://calendar-sync-os.vercel.app` にアクセス
2. 「Googleでログイン」をクリック
3. 認証が正常に動作するか確認

---

## 🐛 トラブルシューティング

### 問題: デプロイが2回発生する

**原因**: `git push`と`vercel --prod`の両方を実行している

**解決方法**:
- `git push`のみを使用する（推奨）
- または`vercel --prod`のみを使用する（Git pushしない場合）

### 問題: デプロイが開始されない

**原因**: VercelとGitHubの連携が切れている

**解決方法**:
1. [Vercelダッシュボード](https://vercel.com/dashboard)にアクセス
2. プロジェクト設定を確認
3. GitHub連携を確認

---

## 📝 まとめ

- ✅ **推奨**: `git push`のみ（自動デプロイ）
- ⚠️ **注意**: `git push`と`vercel --prod`の両方は実行しない
- 🛠️ **便利**: `./scripts/deploy.sh`を使用すると重複を防げる
