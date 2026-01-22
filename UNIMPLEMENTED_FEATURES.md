# 未実装機能リスト

## Phase 1（優先度: 最高）

### ✅ 完了
- **Google OAuth認証**
  - 実装ファイル: `backend/src/controllers/auth.controller.ts`, `backend/src/services/oauth.service.ts`
  - 状態: 完全実装済み（認証URL生成、コールバック処理、トークンリフレッシュ）

- **複数アカウント接続**
  - 実装ファイル: `backend/src/controllers/account.controller.ts`, `backend/src/models/accountModel.ts`
  - 状態: 完全実装済み（アカウント一覧取得、削除）

- **カレンダー一覧取得**
  - 実装ファイル: `backend/src/controllers/calendarController.ts`, `backend/src/services/calendar.service.ts`
  - 状態: 完全実装済み（Google Calendar APIから取得、DB保存）

- **FreeBusy API統合**
  - 実装ファイル: `backend/src/controllers/freebusy.controller.ts`, `backend/src/services/freebusy.service.ts`
  - 状態: 完全実装済み（空き時間検索、スコアリング）

- **空き時間検索UI**
  - 実装ファイル: `frontend/src/pages/FindSlots.tsx`, `frontend/src/pages/components/SearchForm.tsx`
  - 状態: 完全実装済み（検索フォーム、結果表示）

- **予定作成機能**
  - 実装ファイル: `frontend/src/pages/components/SlotCard.tsx`, `backend/src/controllers/calendarController.ts`
  - 状態: 完全実装済み（カレンダー選択、イベント作成）

**Phase 1 進捗: 100% (6/6機能)**

---

## Phase 2（優先度: 高）

### ✅ 完了
- **Canonical Events管理**
  - 実装ファイル: `backend/src/models/canonical-event.model.ts`
  - 状態: 完全実装済み（CRUD操作）

- **Event Links紐づけ**
  - 実装ファイル: `backend/src/models/event-link.model.ts`
  - 状態: 完全実装済み（Canonical ↔ Google Calendar の紐づけ）

- **Hash計算・変更検知**
  - 実装ファイル: `backend/src/utils/event-hash.ts`
  - 状態: 完全実装済み（SHA256ハッシュ計算、変更検知）

- **ループ防止（DB + extendedProperties）**
  - 実装ファイル: `backend/src/utils/extended-properties.ts`, `backend/src/services/sync.service.ts` (isSelfReflection)
  - 状態: 完全実装済み（syncOpId、hash + タイムスタンプによる判定）

### 🚧 部分実装
- **片方向同期（A→B/C）**
  - 実装ファイル: `backend/src/services/sync.service.ts`, `backend/src/services/propagation.service.ts`
  - 状態: **伝播処理が未実装**
  - 問題点:
    - `sync.service.ts`の`upsertEvent()`メソッド（139行目）に「伝播はスキップ（Phase 3で実装）」というコメントあり
    - `propagation.service.ts`は実装済みだが、`sync.service.ts`から呼び出されていない
  - 必要修正:
    - `backend/src/services/sync.service.ts`の`upsertEvent()`メソッドで、Canonical更新後に`propagationService.propagateEvent()`を呼び出す
  - 実装見積もり: 1-2時間
  - 依存: propagation.service.ts（実装済み）

**Phase 2 進捗: 80% (4/5機能)**

---

## Phase 3（優先度: 中）

### ✅ 完了
- **競合検出・解決**
  - 実装ファイル: `backend/src/services/conflict.service.ts`
  - 状態: 完全実装済み（content_hash比較、競合解決、伝播）

- **Push通知（watch）**
  - 実装ファイル: `backend/src/services/watch.service.ts`, `backend/src/controllers/webhook.controller.ts`
  - 状態: 完全実装済み（watch設定、更新、停止、webhook受信）

- **BullMQキュー**
  - 実装ファイル: `backend/src/queues/sync.queue.ts`, `backend/src/workers/sync.worker.ts`
  - 状態: 完全実装済み（キュー定義、ワーカー処理）

- **定期ポーリング**
  - 実装ファイル: `backend/src/jobs/syncScheduler.ts`
  - 状態: 完全実装済み（cronジョブ、15分間隔）

- **Dashboard UI**
  - 実装ファイル: `frontend/src/pages/Dashboard.tsx`
  - 状態: 完全実装済み（同期ステータス、アカウント一覧、競合表示、ログ）

- **Conflicts解決UI**
  - 実装ファイル: `frontend/src/pages/ConflictDetail.tsx`, `frontend/src/components/ConflictDiff.tsx`, `frontend/src/components/ManualMergeModal.tsx`
  - 状態: 完全実装済み（競合表示、解決方法選択、手動マージ）

- **Rules設定UI**
  - 実装ファイル: `frontend/src/pages/Rules.tsx`, `frontend/src/pages/Rules/components/CalendarSettings.tsx`, `frontend/src/pages/Rules/components/ExclusionRules.tsx`
  - 状態: 完全実装済み（カレンダー設定、除外ルール）

### 🚧 部分実装
- **逆同期（B/C→A）**
  - 実装ファイル: `backend/src/services/propagation.service.ts`, `backend/src/services/sync.service.ts`
  - 状態: **伝播処理が未統合**
  - 問題点:
    - `propagation.service.ts`は実装済みだが、`sync.service.ts`の`upsertEvent()`から呼び出されていない
    - 現在は競合解決時のみ伝播が実行される（`conflict.service.ts`）
    - 通常の同期フローでは、B/Cで変更されたイベントがAに伝播されない
  - 必要修正:
    - `backend/src/services/sync.service.ts`の`upsertEvent()`メソッドで、Canonical更新後に伝播処理を呼び出す
    - `sync_direction`が`'bidirectional'`の場合のみ伝播を実行
  - 実装見積もり: 2-3時間
  - 依存: propagation.service.ts（実装済み）、sync.service.tsの修正

**Phase 3 進捗: 87.5% (7/8機能)**

---

## 📊 進捗サマリー

| Phase | 完了 | 部分実装 | 未実装 | 進捗率 |
|-------|------|----------|--------|--------|
| Phase 1 | 6 | 0 | 0 | **100%** |
| Phase 2 | 4 | 1 | 0 | **80%** |
| Phase 3 | 7 | 1 | 0 | **87.5%** |
| **全体** | **17** | **2** | **0** | **90%** |

---

## 🔧 修正が必要な箇所

### 1. [優先度: 高] 片方向同期の伝播処理統合

**ファイル**: `backend/src/services/sync.service.ts`

**問題**: `upsertEvent()`メソッドでCanonical更新後に伝播処理を呼び出していない

**修正内容**:
```typescript
// backend/src/services/sync.service.ts の upsertEvent()メソッド内

// 現在（139行目付近）:
// f. 伝播はスキップ（Phase 3で実装）
console.log(`Upserted event ${googleEvent.id} -> canonical ${canonicalEvent.id}`);

// 修正後:
// f. 伝播処理（片方向同期: A→B/C）
const calendar = await calendarModel.findById(calendar.id);
if (calendar.sync_enabled && calendar.sync_direction !== 'readonly') {
  const eventLink = await eventLinkModel.findByAccountIdAndGcalEventId(
    calendar.account_id,
    googleEvent.id
  );
  if (eventLink) {
    await propagationService.propagateEvent(
      canonicalEvent.id,
      eventLink.id,
      syncOpId
    );
  }
}
console.log(`Upserted event ${googleEvent.id} -> canonical ${canonicalEvent.id}`);
```

**必要なimport追加**:
```typescript
import { propagationService } from './propagation.service';
```

---

### 2. [優先度: 高] 逆同期（B/C→A）の統合

**ファイル**: `backend/src/services/sync.service.ts`

**問題**: 双方向同期時に、B/Cで変更されたイベントがAに伝播されない

**修正内容**: 上記の修正1と同じ（`sync_direction`が`'bidirectional'`の場合も伝播を実行）

**注意**: `propagation.service.ts`は既に実装済みで、`sync_direction`に応じた処理は不要（全EventLinkに伝播するため）

---

## 📝 補足事項

1. **重複ファイルの整理**: PROJECT_STATUS.mdに記載されている重複ファイル（authController.ts vs auth.controller.ts など）は機能実装には影響しないが、コード品質向上のため整理推奨

2. **テスト**: 各機能の実装は完了しているが、統合テストやE2Eテストの追加が推奨される

3. **エラーハンドリング**: 既存の実装でエラーハンドリングは行われているが、より詳細なログやリトライロジックの追加が推奨される

4. **パフォーマンス**: 大量のイベントがある場合の同期パフォーマンス最適化が推奨される

---

## 🎯 次のステップ

1. **即座に対応**:
   - `sync.service.ts`の`upsertEvent()`メソッドに伝播処理を追加（修正1, 2）

2. **短期対応（1週間以内）**:
   - 伝播処理の統合テスト
   - 双方向同期の動作確認

3. **中期対応（1ヶ月以内）**:
   - 重複ファイルの整理
   - 統合テストの追加
   - パフォーマンス最適化
