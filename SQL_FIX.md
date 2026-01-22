# SQL構文エラーの修正

## 🔴 発生していたエラー

```
syntax error at or near "$"
```

このエラーは、`accountModel.update()`メソッドで使用していた`buildUpdateQuery`関数が、`'id = $X'`というプレースホルダーを正しく処理できていなかったために発生していました。

---

## 🔍 原因

`buildUpdateQuery`関数は、WHERE句のプレースホルダーを`/\$\d+/`という正規表現で置換しようとしていましたが、`$X`は数字ではないため、置換されずにそのまま残ってしまい、SQL構文エラーが発生していました。

---

## ✅ 修正内容

`accountModel.update()`メソッドを、`buildUpdateQuery`を使わずに直接実装するように変更しました。

**修正前**:
```typescript
const { query, params } = buildUpdateQuery('accounts', fields, 'id = $X', id);
```

**修正後**:
```typescript
// 更新するフィールドを直接構築
const updateFields: string[] = [];
const values: any[] = [];
let paramIndex = 1;

// 各フィールドを処理
if (updates.oauth_access_token !== undefined) {
  updateFields.push(`oauth_access_token = $${paramIndex}`);
  values.push(updates.oauth_access_token);
  paramIndex++;
}
// ... 他のフィールドも同様に処理

// WHERE句のパラメータ
values.push(id);
const whereParam = `$${paramIndex}`;

const query = `
  UPDATE accounts 
  SET ${updateFields.join(', ')}
  WHERE id = ${whereParam}
  RETURNING *
`;
```

---

## 🚀 動作確認

1. ブラウザで `http://localhost:5173` にアクセス
2. 「Googleでログイン」をクリック
3. Googleアカウントで認証
4. ダッシュボードが表示されれば成功

---

## 📋 修正完了チェックリスト

- [x] `accountModel.update()`メソッドを直接実装
- [x] SQL構文エラーを修正
- [x] Backendサーバーを再起動
- [ ] ブラウザでログインを試す
- [ ] アカウント情報が正しく保存されることを確認
- [ ] ダッシュボードが表示されることを確認

---

修正が完了しました。再度ログインを試してください。SQL構文エラーが解消され、アカウント情報が正しく保存されるはずです。
