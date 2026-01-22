# 🐛 バグ・エラー診断レポート

## 検出されたバグ・問題

### 1. [重大度: 高] フロントエンドとバックエンドのレスポンス形式不一致 - SyncStatus

**ファイル**: 
- `frontend/src/components/SyncStatus.tsx:4-8`
- `backend/src/controllers/syncController.ts:189-234`

**問題**: 
フロントエンドは`{ successRate, errorCount, avgDelay }`を期待しているが、バックエンドは`{ enabledCalendars, totalCalendars, successRate, errorCount, last7Days }`を返している。`avgDelay`フィールドが存在しない。

**影響**: 
- フロントエンドで`status.avgDelay`にアクセスすると`undefined`になり、`toFixed()`呼び出しでエラーが発生する可能性がある
- 平均遅延時間が表示されない

**修正方法**: 
```typescript
// backend/src/controllers/syncController.ts:189-234
// 平均遅延時間を計算するロジックを追加
syncRouter.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const calendars = await calendarModel.findByAccountId(accountId);
    const enabledCalendars = calendars.filter(c => c.sync_enabled);

    // 最近の同期ログを取得
    const logsResult = await db.query(
      `SELECT result, COUNT(*) as count,
              AVG(EXTRACT(EPOCH FROM (NOW() - timestamp))) as avg_delay
       FROM sync_log 
       WHERE (from_account_id = $1 OR to_account_id = $1)
       AND timestamp > NOW() - INTERVAL '7 days'
       AND result = 'success'
       GROUP BY result`,
      [accountId]
    );

    const successCount = logsResult.rows.find((r: any) => r.result === 'success')?.count || 0;
    const errorCount = logsResult.rows.find((r: any) => r.result === 'error')?.count || 0;
    const total = successCount + errorCount;
    const successRate = total > 0 ? (successCount / total) * 100 : 100;
    const avgDelay = logsResult.rows.find((r: any) => r.result === 'success')?.avg_delay || 0;

    res.json({
      successRate: Math.round(successRate * 10) / 10,
      errorCount: parseInt(errorCount),
      avgDelay: Math.round(avgDelay * 10) / 10, // 秒単位
      enabledCalendars: enabledCalendars.length,
      totalCalendars: calendars.length,
      last7Days: {
        success: parseInt(successCount),
        errors: parseInt(errorCount),
        total
      }
    });
    return;
  } catch (error: any) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ error: 'Failed to fetch sync status', message: error.message });
    return;
  }
});
```

---

### 2. [重大度: 高] フロントエンドとバックエンドのレスポンス形式不一致 - SyncLog

**ファイル**: 
- `frontend/src/components/SyncLog.tsx:6-13`
- `backend/src/controllers/syncController.ts:12-40`

**問題**: 
フロントエンドは`{ id, timestamp, operation, result, eventsSynced, errors }`を期待しているが、バックエンドの`sync_log`テーブルには`eventsSynced`フィールドが存在しない。実際のスキーマは`{ id, timestamp, operation, from_account_id, to_account_id, event_id, result, error, metadata }`。

**影響**: 
- `log.eventsSynced`が`undefined`になり、表示が正しくない
- `log.errors`は配列ではなく、`error`フィールドが文字列として存在する

**修正方法**: 
```typescript
// backend/src/controllers/syncController.ts:12-40
syncRouter.get('/logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { limit = 50 } = req.query;
    const limitNum = parseInt(limit as string);

    const result = await db.query(
      `SELECT 
        id,
        timestamp,
        operation,
        result,
        error,
        metadata,
        CASE 
          WHEN metadata->>'eventsSynced' IS NOT NULL 
          THEN (metadata->>'eventsSynced')::int 
          ELSE 0 
        END as events_synced
       FROM sync_log 
       WHERE from_account_id = $1 OR to_account_id = $1
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [accountId, limitNum]
    );

    // レスポンス形式をフロントエンドに合わせる
    const logs = result.rows.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      operation: row.operation || 'sync',
      result: row.result || 'pending',
      eventsSynced: row.events_synced || 0,
      errors: row.error ? [row.error] : []
    }));

    res.json({ logs });
    return;
  } catch (error: any) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ error: 'Failed to fetch sync logs', message: error.message });
    return;
  }
});
```

---

### 3. [重大度: 高] 存在しないエンドポイントへのリクエスト

**ファイル**: 
- `frontend/src/services/syncService.ts:43-46`
- `backend/src/controllers/syncController.ts`

**問題**: 
フロントエンドの`syncService.triggerSync()`は`POST /api/sync/trigger`を呼び出しているが、バックエンドにはこのエンドポイントが存在しない。代わりに`POST /api/sync/manual`が存在する。

**影響**: 
- 404エラーが発生する
- 同期トリガー機能が動作しない

**修正方法**: 
```typescript
// frontend/src/services/syncService.ts:43-46
async triggerSync() {
  const response = await api.post('/sync/manual'); // /sync/trigger → /sync/manual に変更
  return response.data;
}
```

または、バックエンドに`/sync/trigger`エンドポイントを追加：
```typescript
// backend/src/controllers/syncController.ts
syncRouter.post('/trigger', async (req: Request, res: Response): Promise<void> => {
  // /sync/manualと同じロジックを実装
  // または /sync/manualにリダイレクト
  return syncRouter.post('/manual', ...);
});
```

---

### 4. [重大度: 中] parseInt()のエラーハンドリング不足

**ファイル**: 
- `backend/src/controllers/syncController.ts:22, 52-53`

**問題**: 
`parseInt(limit as string)`や`parseInt(offset as string)`で、無効な値（`NaN`）が渡された場合のチェックがない。

**影響**: 
- `NaN`がSQLクエリに渡されると、予期しない動作やエラーが発生する可能性がある

**修正方法**: 
```typescript
const limitNum = parseInt(limit as string);
if (isNaN(limitNum) || limitNum < 1) {
  res.status(400).json({ error: 'Invalid limit parameter' });
  return;
}

const offsetNum = parseInt(offset as string);
if (isNaN(offsetNum) || offsetNum < 0) {
  res.status(400).json({ error: 'Invalid offset parameter' });
  return;
}
```

---

### 5. [重大度: 中] トークンリフレッシュ時の競合状態

**ファイル**: 
- `backend/src/services/oauth.service.ts:204-262`

**問題**: 
`getAuthenticatedClient()`でトークンをリフレッシュする際、複数のリクエストが同時に同じアカウントのトークンをリフレッシュしようとすると、競合状態が発生する可能性がある。

**影響**: 
- 同じトークンが複数回リフレッシュされる
- データベースへの不要な書き込みが発生する

**修正方法**: 
```typescript
// ロック機構を追加（Redisやデータベースロックを使用）
private refreshTokenLocks = new Map<string, Promise<void>>();

async getAuthenticatedClient(accountId: string): Promise<OAuth2Client> {
  // 既にリフレッシュ中の場合は待機
  if (this.refreshTokenLocks.has(accountId)) {
    await this.refreshTokenLocks.get(accountId);
  }

  const account = await accountModel.findById(accountId);
  // ... 既存のコード ...

  if (needsRefresh) {
    const refreshPromise = this.refreshToken(accountId)
      .finally(() => {
        this.refreshTokenLocks.delete(accountId);
      });
    this.refreshTokenLocks.set(accountId, refreshPromise);
    
    try {
      await refreshPromise;
      // ... 既存のコード ...
    } catch (error: any) {
      // ... 既存のコード ...
    }
  }
  // ... 既存のコード ...
}
```

---

### 6. [重大度: 低] CSRF対策の不足

**ファイル**: 
- `backend/src/index.ts:33-43`

**問題**: 
セッション管理は実装されているが、CSRFトークンの検証が行われていない。

**影響**: 
- CSRF攻撃のリスクがある

**修正方法**: 
```typescript
// csrfパッケージをインストール: npm install csurf
import csrf from 'csurf';

const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
});

// GETリクエスト以外にCSRF保護を適用
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  return csrfProtection(req, res, next);
});
```

---

### 7. [重大度: 低] エラーメッセージの情報漏洩リスク

**ファイル**: 
- `backend/src/controllers/syncController.ts`（複数箇所）

**問題**: 
エラーハンドリングで`error.message`をそのまま返しているため、内部実装の詳細が漏洩する可能性がある。

**影響**: 
- セキュリティリスク（スタックトレースや内部パスの漏洩）

**修正方法**: 
```typescript
// 本番環境では詳細なエラーメッセージを返さない
catch (error: any) {
  console.error('Error fetching sync logs:', error);
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'Failed to fetch sync logs'
    : error.message;
  res.status(500).json({ 
    error: 'Failed to fetch sync logs', 
    message: errorMessage 
  });
  return;
}
```

---

### 8. [重大度: 低] N+1クエリ問題の可能性

**ファイル**: 
- `backend/src/services/sync.service.ts:36-49`

**問題**: 
`syncCalendar()`内で、各イベントに対して`upsertEvent()`を順次呼び出している。`upsertEvent()`内で複数のDBクエリが実行される可能性がある。

**影響**: 
- 大量のイベントがある場合、パフォーマンスが低下する

**修正方法**: 
```typescript
// バッチ処理を検討
const BATCH_SIZE = 10;
for (let i = 0; i < googleEvents.length; i += BATCH_SIZE) {
  const batch = googleEvents.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(event => this.upsertEvent(event, calendar)));
}
```

---

## セキュリティチェック結果

### ✅ SQL Injection対策
- **状態**: 良好
- **理由**: すべてのクエリでパラメータ化クエリ（`$1`, `$2`など）を使用している

### ✅ トークン暗号化
- **状態**: 実装済み
- **理由**: `oauth.service.ts`でAES-256-CBC暗号化が実装されている

### ⚠️ CSRF対策
- **状態**: 未実装
- **推奨**: CSRFトークンの検証を追加

---

## パフォーマンス確認結果

### ⚠️ N+1クエリ問題
- **状態**: 潜在的な問題あり
- **場所**: `sync.service.ts`のイベント処理ループ
- **推奨**: バッチ処理の実装を検討

### ✅ 不要なAPI呼び出し
- **状態**: 良好
- **理由**: React Queryのキャッシュ機能が適切に使用されている

---

## エッジケース処理

### ✅ OAuth拒否時の処理
- **状態**: 実装済み
- **場所**: `oauth.service.ts:141-143`

### ✅ トークン期限切れ時の処理
- **状態**: 実装済み
- **場所**: `oauth.service.ts:214-241`で自動リフレッシュ

### ⚠️ ネットワークエラー時の処理
- **状態**: 部分的に実装
- **推奨**: リトライロジックの強化

### ⚠️ 同時リクエストの処理
- **状態**: 競合状態の可能性あり
- **推奨**: トークンリフレッシュ時のロック機構を追加

---

## 優先度別修正推奨順

1. **最優先（即座に修正）**:
   - #1: SyncStatusのレスポンス形式不一致
   - #2: SyncLogのレスポンス形式不一致
   - #3: 存在しないエンドポイントへのリクエスト

2. **高優先度（近日中に修正）**:
   - #4: parseInt()のエラーハンドリング
   - #5: トークンリフレッシュ時の競合状態

3. **中優先度（計画的な修正）**:
   - #6: CSRF対策
   - #7: エラーメッセージの情報漏洩対策

4. **低優先度（最適化）**:
   - #8: N+1クエリ問題の改善
