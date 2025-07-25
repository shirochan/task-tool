import { Task } from '@/lib/types';

/**
 * 優先度のカラーシステム
 */
export const PRIORITY_COLORS = {
  must: {
    text: 'text-[var(--priority-must)]',
    bg: 'bg-[var(--priority-must-bg)]',
    border: 'border-[var(--priority-must)]',
    className: 'bg-[var(--priority-must-bg)] text-[var(--priority-must)] border-[var(--priority-must)]'
  },
  want: {
    text: 'text-[var(--priority-want)]',
    bg: 'bg-[var(--priority-want-bg)]',
    border: 'border-[var(--priority-want)]',
    className: 'bg-[var(--priority-want-bg)] text-[var(--priority-want)] border-[var(--priority-want)]'
  }
} as const;

/**
 * ステータスのカラーシステム
 */
export const STATUS_COLORS = {
  pending: {
    text: 'text-[var(--status-pending)]',
    bg: 'bg-[var(--status-pending-bg)]',
    border: 'border-[var(--status-pending)]',
    className: 'bg-[var(--status-pending-bg)] text-[var(--status-pending)] border-[var(--status-pending)]'
  },
  in_progress: {
    text: 'text-[var(--status-in-progress)]',
    bg: 'bg-[var(--status-in-progress-bg)]',
    border: 'border-[var(--status-in-progress)]',
    className: 'bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress)] border-[var(--status-in-progress)]'
  },
  on_hold: {
    text: 'text-[var(--status-on-hold)]',
    bg: 'bg-[var(--status-on-hold-bg)]',
    border: 'border-[var(--status-on-hold)]',
    className: 'bg-[var(--status-on-hold-bg)] text-[var(--status-on-hold)] border-[var(--status-on-hold)]'
  },
  review: {
    text: 'text-[var(--status-review)]',
    bg: 'bg-[var(--status-review-bg)]',
    border: 'border-[var(--status-review)]',
    className: 'bg-[var(--status-review-bg)] text-[var(--status-review)] border-[var(--status-review)]'
  },
  completed: {
    text: 'text-[var(--status-completed)]',
    bg: 'bg-[var(--status-completed-bg)]',
    border: 'border-[var(--status-completed)]',
    className: 'bg-[var(--status-completed-bg)] text-[var(--status-completed)] border-[var(--status-completed)]'
  },
  cancelled: {
    text: 'text-[var(--status-cancelled)]',
    bg: 'bg-[var(--status-cancelled-bg)]',
    border: 'border-[var(--status-cancelled)]',
    className: 'bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)] border-[var(--status-cancelled)]'
  }
} as const;

/**
 * 優先度に基づいてカラークラスを取得
 */
export const getPriorityColorClass = (priority: 'must' | 'want') => {
  return PRIORITY_COLORS[priority].className;
};

/**
 * ステータスに基づいてカラークラスを取得
 */
export const getStatusColorClass = (status: Task['status']) => {
  return STATUS_COLORS[status].className;
};

/**
 * 優先度ラベル
 */
export const PRIORITY_LABELS = {
  must: '必須',
  want: '希望'
} as const;

/**
 * フィードバック用カラー（トーストなど）
 */
export const FEEDBACK_COLORS = {
  success: 'text-[var(--status-completed)] bg-[var(--status-completed-bg)]',
  error: 'text-[var(--priority-must)] bg-[var(--priority-must-bg)]',
  warning: 'text-[var(--status-on-hold)] bg-[var(--status-on-hold-bg)]',
  info: 'text-[var(--status-in-progress)] bg-[var(--status-in-progress-bg)]'
} as const;