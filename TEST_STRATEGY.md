# タスク管理ツール - 実践的テスト戦略書 v2.0

## 基本方針の再検討

**コードベース分析結果**：
- **アーキテクチャ**: Service → Database 間で better-sqlite3 + 遅延初期化パターン
- **AI機能**: OpenAI API + 複雑なフォールバック機能とレスポンス検証
- **State管理**: 複雑なReact hooks（TaskManager）
- **API層**: 手動バリデーション + エラーハンドリング（11エンドポイント）

**戦略調整**：
複雑な現実のアーキテクチャに対して**段階的・実用性重視**のアプローチを採用

## 技術スタック（再選定）

### テストフレームワーク
- **Jest** (Vitest → Jest変更理由)
  - better-sqlite3のモック化がより確立されている
  - Next.js 15対応も充分
  - 複雑なデータベース処理のモック化に関する知見が豊富

### テスト補助ライブラリ
- **React Testing Library** + **Jest DOM**
- **MSW** (API モック)
- **@jest/globals** (modern Jest)

## 実装戦略（段階的アプローチ）

### Phase 1: Foundation Layer（1-2日）
**目標**: テスト環境構築 + 最もシンプルな機能からスタート

1. **テスト環境セットアップ**
   ```bash
   npm install -D jest @jest/globals @testing-library/react @testing-library/jest-dom jest-environment-jsdom
   ```

2. **データベーステスト戦略**
   - In-memory SQLite（`:memory:`）でテスト用DB作成
   - `db.ts`をテスト時に環境変数で制御可能にする改修
   - テスト用のDatabase factory関数作成

3. **最初のテスト対象**
   - `src/lib/utils.ts` - ユーティリティ関数（最もシンプル）
   - `src/lib/constants/ui-constants.ts` - 定数とヘルパー

### Phase 2: Service Layer Core（2-3日）
**目標**: ビジネスロジックの中核部分を確実にテスト

4. **TaskService基本CRUD**
   - `createTask()`, `getTaskById()`, `getAllTasks()`
   - `updateTask()`, `deleteTask()`
   - テスト用DatabaseとTransactionの基本テスト

5. **TaskService Schedule機能**
   - `getScheduleByDate()`, `generateWeeklySchedule()`
   - **複雑な`moveTaskToDate()`は後回し**

### Phase 3: AI Service & Error Handling（2日）
**目標**: AI機能の確実性を担保

6. **AIServiceのモック戦略**
   - OpenAI APIをMSWでモック
   - `validateEstimateResponse()`の境界値テスト
   - **フォールバック機能のテスト**（重要）

7. **エラーハンドリング**
   - API失敗時のフォールバック動作
   - バリデーション失敗時の適切なエラーレスポンス

### Phase 4: API Layer（2-3日）
**目標**: 11エンドポイントの中から重要なものを優先

8. **重要度順API テスト**
   - **高**: `/api/tasks` (CRUD)
   - **高**: `/api/estimate` (AI統合)
   - **中**: `/api/schedule/*` (スケジュール管理)
   - **低**: `/api/settings`, `/api/categories`, `/api/backup`

### Phase 5: Component Layer（選択的）（2日）
**目標**: UIロジックが複雑な部分のみテスト

9. **Priority 1 コンポーネント**
   - `TaskForm` - AI統合フォーム（重要）
   - `TaskManager` - 状態管理（部分的にテスト）

10. **Priority 2 コンポーネント**
    - `WeeklySchedule` - ドラッグ&ドロップ機能（時間があれば）

## ディレクトリ構造（シンプル化）

```
src/
├── __tests__/
│   ├── utils.test.ts                    # Phase 1
│   ├── services/
│   │   ├── taskService.test.ts          # Phase 2
│   │   └── aiService.test.ts            # Phase 3
│   ├── api/
│   │   ├── tasks.test.ts                # Phase 4
│   │   └── estimate.test.ts             # Phase 4
│   └── components/
│       └── TaskForm.test.tsx            # Phase 5
├── test-utils/
│   ├── test-db.ts                       # データベースモック
│   ├── api-mocks.ts                     # MSWハンドラー
│   └── fixtures.ts                      # テストデータ
```

## 現実的な品質目標

### カバレッジ目標（控えめ設定）
- **Service層**: 85%以上（最重要）
- **API層**: 70%以上（重要エンドポイントのみ）
- **Component層**: 60%以上（選択的）
- **全体**: 70%以上

### パフォーマンス目標
- 全テスト実行: 45秒以内
- ウォッチモード: 5秒以内

## 技術課題と対策

### 1. better-sqlite3モック化
```javascript
// test-utils/test-db.ts
const testDb = new Database(':memory:');
// 環境変数でテスト用DB使用を制御
```

### 2. OpenAI APIモック
```javascript
// MSWでOpenAI APIをモック、フォールバック動作も含めて
```

### 3. 複雑な状態管理のテスト
```javascript
// TaskManagerは重要な部分のみテスト、完全性より実用性
```

## マイルストーン（現実的）

### Week 1 (5営業日)
- Phase 1-2完了
- ServiceレイヤーのCRUD操作テスト完了
- CI/CDに統合

### Week 2 (5営業日)  
- Phase 3-4完了
- AI機能とAPI層の重要部分テスト完了

### Week 3 (3営業日)
- Phase 5完了（時間に応じて）
- ドキュメント整備
- テストメンテナンス体制構築

## 成功の定義

1. **重要機能の安全性**: Service層とAI機能が確実にテストされている
2. **実装可能性**: 複雑すぎず、実際に完成・運用できる
3. **継続性**: 新機能追加時にテストを書きやすい環境
4. **実用性**: バグを早期発見し、リファクタリングを支援する

**この戦略により、完璧を目指すより実用的で持続可能なテスト基盤を構築します。**