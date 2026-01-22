# テスト実行ガイド

このディレクトリには、CalendarSync OSのテストコードとテスト用スクリプトが含まれています。

## ディレクトリ構造

```
tests/
├── README.md                          # このファイル
├── curl-commands.sh                   # cURLコマンド集
├── integration/
│   └── api.test.ts                   # API統合テスト
├── controllers/
│   └── account.controller.test.ts    # アカウントコントローラーテスト
├── models/
│   └── accountModel.test.ts          # アカウントモデルテスト
├── services/
│   └── calendar.service.test.ts       # カレンダーサービステスト
├── utils/
│   └── event-hash.test.ts            # イベントハッシュ計算テスト
└── postman/
    └── CalendarSync-OS.postman_collection.json  # Postmanコレクション
```

## テストの実行

### ユニットテスト

```bash
# すべてのテストを実行
npm test

# 特定のテストファイルを実行
npm test -- event-hash.test.ts

# ウォッチモードで実行
npm run test:watch

# カバレッジレポート付きで実行
npm run test:coverage
```

### 統合テスト

統合テストは実際のデータベース接続が必要です。テスト用のデータベースを用意してください。

```bash
# テスト用環境変数を設定
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/calendar_sync_test
export NODE_ENV=test

# 統合テストを実行
npm test -- integration/api.test.ts
```

## 手動テスト

### 1. OAuth認証フローテスト

```bash
# テストスクリプトを実行
./scripts/test-oauth-flow.sh

# または手動で
curl -v -L http://localhost:3000/api/auth/google -c cookies.txt -b cookies.txt
```

### 2. cURLコマンド集

```bash
# コマンド一覧を表示
bash tests/curl-commands.sh

# 環境変数を設定して実行
export BASE_URL=http://localhost:3000/api
export SESSION_COOKIE='connect.sid=YOUR_SESSION_ID'
bash tests/curl-commands.sh
```

### 3. Postmanコレクション

1. Postmanを開く
2. 「Import」をクリック
3. `tests/postman/CalendarSync-OS.postman_collection.json`を選択
4. 環境変数を設定:
   - `base_url`: `http://localhost:3000/api`
   - `session_cookie`: OAuth認証後に取得したセッションクッキー

## サンプルデータ投入

```bash
# テスト用データを投入
npx tsx scripts/seed-test-data.ts
```

## テストカバレッジ

現在のテストカバレッジを確認:

```bash
npm run test:coverage
```

カバレッジレポートは `coverage/` ディレクトリに生成されます。

## トラブルシューティング

### テストが失敗する場合

1. **環境変数が設定されているか確認**
   ```bash
   echo $DATABASE_URL
   echo $NODE_ENV
   ```

2. **データベースが起動しているか確認**
   ```bash
   psql -h localhost -U postgres -d calendar_sync_test -c "SELECT 1;"
   ```

3. **依存関係がインストールされているか確認**
   ```bash
   npm install
   ```

### モックが正しく動作しない場合

Jestのモックは、テストファイルの先頭でインポートする前に設定する必要があります。

```typescript
// 正しい順序
jest.mock('../../src/models/accountModel');
import { accountModel } from '../../src/models/accountModel';
```

## 参考

- [Jest ドキュメント](https://jestjs.io/docs/getting-started)
- [Supertest ドキュメント](https://github.com/visionmedia/supertest)
- [メインのテストガイド](../TESTING_GUIDE.md)
