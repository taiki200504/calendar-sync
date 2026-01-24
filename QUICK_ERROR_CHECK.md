# クイックエラーチェック

## 🚀 すぐに試せる3つの方法

### 方法1: ヘルスチェック（最も簡単）

ブラウザで以下にアクセス：
```
https://calendar-sync-khdp87x3i-taikimishimabiz-gmailcoms-projects.vercel.app/api/health
```

**確認すべき点**:
- `status: "ok"` が返ってくるか
- `hasDatabaseUrl: true` か
- `hasRedisUrl: true` か

---

### 方法2: ブラウザのコンソールを確認

1. **アプリにアクセス**
   ```
   https://calendar-sync-khdp87x3i-taikimishimabiz-gmailcoms-projects.vercel.app
   ```

2. **開発者ツールを開く**
   - `F12` または `Cmd+Option+I` (Mac)

3. **Consoleタブを確認**
   - 赤いエラーメッセージを探す
   - エラーメッセージをコピー

4. **Networkタブを確認**
   - 失敗しているリクエスト（赤色）を探す
   - クリックして詳細を確認

---

### 方法3: Vercelのログを確認

```bash
# 最新のデプロイメントのログを確認
vercel logs https://calendar-sync-khdp87x3i-taikimishimabiz-gmailcoms-projects.vercel.app
```

または、Vercelダッシュボードで確認：
1. https://vercel.com/dashboard にアクセス
2. プロジェクトを選択
3. 「Deployments」タブ
4. 最新のデプロイメントをクリック
5. 「Runtime Logs」タブでエラーを確認

---

## 📋 エラー情報を収集する

以下の情報をコピーして共有してください：

### 1. ヘルスチェックの結果
```
[ブラウザで/api/healthにアクセスした結果を貼り付け]
```

### 2. ブラウザのコンソールエラー
```
[Consoleタブのエラーメッセージをコピー]
```

### 3. ネットワークエラー
```
[Networkタブで失敗しているリクエストの詳細をコピー]
```

### 4. 発生している操作
- どの操作でエラーが発生するか
- エラーが発生するタイミング

---

## 🔍 よくあるエラーパターン

### パターン1: "Invalid state parameter"
**原因**: セッション管理の問題
**確認**: Redis接続を確認

### パターン2: 404エラー
**原因**: ルーティングの問題
**確認**: URLが正しいか確認

### パターン3: CORSエラー
**原因**: CORS設定の問題
**確認**: `FRONTEND_URL`を確認

### パターン4: データベース接続エラー
**原因**: `DATABASE_URL`の問題
**確認**: 環境変数を確認

---

## 💡 次のステップ

エラー情報を収集したら、以下を共有してください：
1. **エラーメッセージ**（完全なテキスト）
2. **発生している操作**（何をしようとしたときか）
3. **スクリーンショット**（可能であれば）

これらの情報があれば、原因を特定して修正できます！
