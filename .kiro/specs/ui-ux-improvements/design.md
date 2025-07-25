# UI/UX改善 設計書

## 概要

現在のタスク管理ツールのUI/UXを改善し、ローカル環境での長時間使用に適した効率的なインターフェースを実現する。既存のNext.js + TypeScript + Tailwind CSS + shadcn/uiの技術スタックを活用し、段階的に改善を実装する。

## アーキテクチャ

### 全体構成
```
src/
├── components/
│   ├── layout/              # 新規: レイアウト関連
│   │   ├── Sidebar.tsx
│   │   ├── Dashboard.tsx
│   │   └── InfoPanel.tsx
│   ├── ui/                  # 既存: shadcn/ui拡張
│   │   ├── toast.tsx        # 新規: トースト通知
│   │   ├── progress-bar.tsx # 新規: プログレスバー
│   │   └── inline-edit.tsx  # 新規: インライン編集
│   ├── task/               # 既存コンポーネントの改善
│   │   ├── TaskCard.tsx    # 改善: インライン編集対応
│   │   ├── TaskList.tsx    # 改善: 仮想スクロール対応
│   │   └── QuickAdd.tsx    # 新規: クイック追加
│   └── schedule/           # 既存コンポーネントの改善
│       └── WeeklySchedule.tsx # 改善: ドラッグ&ドロップ強化
├── hooks/                  # 新規: カスタムフック
│   ├── useInlineEdit.ts
│   ├── useToast.ts
│   └── useVirtualScroll.ts
├── lib/
│   ├── constants/          # 新規: UI定数
│   │   └── ui-constants.ts
│   └── utils/              # 既存: ユーティリティ拡張
│       └── ui-utils.ts
└── styles/                 # 新規: 追加スタイル
    └── animations.css
```

## コンポーネント設計

### 1. レイアウトコンポーネント

#### Dashboard.tsx
```typescript
interface DashboardProps {
  layout: 'default' | 'compact' | 'spacious';
  customization?: DashboardCustomization;
}

interface DashboardCustomization {
  showSidebar: boolean;
  showInfoPanel: boolean;
  taskListWidth: number;
  scheduleWidth: number;
}
```

**機能:**
- タスク一覧とスケジュールの同時表示
- レスポンシブレイアウト
- カスタマイズ可能なパネル配置
- 表示密度の調整

#### Sidebar.tsx
```typescript
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  quickActions: QuickAction[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType;
  action: () => void;
}
```

**機能:**
- ナビゲーション
- クイックアクション
- 統計サマリー表示
- 折りたたみ可能

#### InfoPanel.tsx
```typescript
interface InfoPanelProps {
  selectedTask: Task | null;
  relatedTasks: Task[];
  statistics: TaskStatistics;
}
```

**機能:**
- 選択タスクの詳細表示
- 関連タスクの表示
- 作業時間統計
- 履歴表示

### 2. インライン編集システム

#### useInlineEdit.ts
```typescript
interface UseInlineEditProps<T> {
  initialValue: T;
  onSave: (value: T) => Promise<void>;
  onCancel?: () => void;
  validation?: (value: T) => string | null;
}

interface UseInlineEditReturn<T> {
  isEditing: boolean;
  value: T;
  error: string | null;
  startEdit: () => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<void>;
  setValue: (value: T) => void;
}
```

#### InlineEdit.tsx
```typescript
interface InlineEditProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  type?: 'text' | 'textarea' | 'select';
  options?: SelectOption[];
  placeholder?: string;
  validation?: (value: string) => string | null;
}
```

**機能:**
- テキスト、テキストエリア、セレクトボックス対応
- バリデーション
- エラーハンドリング
- キーボード操作（Enter保存、Escキャンセル）

### 3. 改善されたタスクコンポーネント

#### TaskCard.tsx（改善版）
```typescript
interface TaskCardProps {
  task: Task;
  layout: 'compact' | 'standard' | 'detailed';
  onUpdate: (task: Task) => void;
  onDelete: (id: number) => void;
  showProgress?: boolean;
  showRelatedInfo?: boolean;
}
```

**新機能:**
- インライン編集対応
- プログレスバー表示
- 優先度カラーコーディング
- ホバー時の詳細表示

#### QuickAdd.tsx
```typescript
interface QuickAddProps {
  onTaskCreated: (task: Task) => void;
  placeholder?: string;
  defaultPriority?: 'must' | 'want';
  defaultCategory?: string;
}
```

**機能:**
- ヘッダー常駐の入力フィールド
- Enter キーでの即座追加
- AI見積もりの自動実行
- 最近使用したカテゴリの提案

### 4. 通知システム

#### useToast.ts
```typescript
interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface UseToastReturn {
  toast: (message: string, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}
```

#### Toast.tsx
```typescript
interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  action?: ToastAction;
  onDismiss: (id: string) => void;
}
```

**機能:**
- 操作結果の即座フィードバック
- 自動消去
- アクションボタン
- スタック表示

### 5. ドラッグ&ドロップ改善

#### Enhanced WeeklySchedule.tsx
```typescript
interface DragFeedback {
  isDragging: boolean;
  isValidDrop: boolean;
  dropPreview?: {
    date: string;
    time: string;
    conflicts: TaskConflict[];
  };
}

interface TaskConflict {
  taskId: number;
  title: string;
  timeRange: string;
}
```

**改善点:**
- ドラッグ中の視覚的フィードバック強化
- ドロップ先のプレビュー表示
- 時間競合の事前警告
- アニメーション付きの状態遷移

## データ管理とパフォーマンス

### 1. 仮想スクロール実装

#### useVirtualScroll.ts
```typescript
interface UseVirtualScrollProps {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface UseVirtualScrollReturn {
  visibleItems: any[];
  scrollElementProps: React.HTMLProps<HTMLDivElement>;
  wrapperProps: React.HTMLProps<HTMLDivElement>;
}
```

### 2. 状態管理の最適化

#### UI状態管理
```typescript
interface UIState {
  layout: {
    sidebarCollapsed: boolean;
    infoPanelVisible: boolean;
    displayDensity: 'compact' | 'standard' | 'spacious';
  };
  selection: {
    selectedTaskId: number | null;
    selectedDate: string | null;
  };
  editing: {
    inlineEditingTaskId: number | null;
    quickAddVisible: boolean;
  };
  customization: DashboardCustomization;
}
```

### 3. キャッシュ戦略

- **タスクデータ**: React Query / SWRでのキャッシュ
- **UI設定**: localStorage での永続化
- **関連タスク**: メモ化による計算結果キャッシュ
- **統計データ**: 定期更新とバックグラウンド計算

## スタイリングとテーマ

### 1. カラーシステム拡張

```css
:root {
  /* 優先度カラー */
  --priority-must: oklch(0.577 0.245 27.325);
  --priority-want: oklch(0.646 0.222 41.116);
  
  /* ステータスカラー */
  --status-pending: oklch(0.556 0 0);
  --status-progress: oklch(0.646 0.222 41.116);
  --status-completed: oklch(0.6 0.118 184.704);
  
  /* フィードバックカラー */
  --feedback-success: oklch(0.6 0.118 184.704);
  --feedback-warning: oklch(0.828 0.189 84.429);
  --feedback-error: oklch(0.577 0.245 27.325);
}
```

### 2. アニメーション定義

```css
/* animations.css */
@keyframes slideIn {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.animate-slide-in { animation: slideIn 0.2s ease-out; }
.animate-fade-in { animation: fadeIn 0.15s ease-out; }
.animate-scale-in { animation: scaleIn 0.1s ease-out; }
```

### 3. レスポンシブブレークポイント

```typescript
const breakpoints = {
  sm: '640px',   // モバイル
  md: '768px',   // タブレット
  lg: '1024px',  // デスクトップ
  xl: '1280px',  // 大画面
  '2xl': '1536px' // 超大画面
} as const;
```

## アクセシビリティ

### 1. キーボードナビゲーション
- Tab順序の最適化
- フォーカス表示の強化
- スクリーンリーダー対応

### 2. ARIA属性
- 動的コンテンツの適切なラベリング
- ライブリージョンでの状態通知
- ロール属性の適切な設定

### 3. カラーアクセシビリティ
- コントラスト比の確保
- カラーブラインド対応
- ハイコントラストモード

## エラーハンドリング

### 1. エラー境界
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}
```

### 2. ユーザーフレンドリーなエラー表示
- 具体的なエラーメッセージ
- リカバリー方法の提示
- エラー報告機能

### 3. オフライン対応
- ネットワークエラーの検出
- オフライン時の機能制限表示
- 再接続時の自動同期

## テスト戦略

### 1. ユニットテスト
- カスタムフックのテスト
- ユーティリティ関数のテスト
- コンポーネントの単体テスト

### 2. 統合テスト
- ドラッグ&ドロップ操作のテスト
- インライン編集のフローテスト
- 通知システムのテスト

### 3. E2Eテスト
- 主要ユーザーフローのテスト
- レスポンシブ表示のテスト
- パフォーマンステスト

## 実装フェーズ

### Phase 1: 基本UI改善
- インライン編集システム
- トースト通知システム
- カラーコーディング統一

### Phase 2: レイアウト改善
- ダッシュボード型レイアウト
- サイドバー実装
- 情報パネル実装

### Phase 3: 高度なUX
- 仮想スクロール実装
- ドラッグ&ドロップ改善
- パーソナライゼーション機能

### Phase 4: 最適化
- パフォーマンス最適化
- アクセシビリティ改善
- モバイル対応強化