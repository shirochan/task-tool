// データベース型定義

export interface Task {
  id: number;
  title: string;
  description?: string;
  priority: 'must' | 'want';
  category?: string;
  estimated_hours?: number;
  actual_hours?: number;
  status: 'pending' | 'in_progress' | 'on_hold' | 'review' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  priority: 'must' | 'want';
  category?: string;
  estimated_hours?: number;
  status?: TaskStatus;
}

export interface TaskSchedule {
  id: number;
  task_id: number;
  day_of_week: number; // 1=月曜, 5=金曜
  start_time?: string;
  end_time?: string;
  scheduled_date: string;
  created_at: string;
}

export interface TaskScheduleWithTask extends TaskSchedule {
  title: string;
  description?: string;
  priority: 'must' | 'want';
  category?: string;
  estimated_hours?: number;
  actual_hours?: number;
  status: TaskStatus;
  updated_at: string;
}

export interface AIEstimate {
  id: number;
  task_id: number;
  estimated_hours: number;
  confidence_score?: number;
  reasoning?: string;
  questions_asked?: string; // JSON文字列
  created_at: string;
}

export interface AIEstimateInput {
  task_id: number;
  estimated_hours: number;
  confidence_score?: number;
  reasoning?: string;
  questions_asked?: string[];
}

// 週間スケジュールビュー用の型
export interface WeeklySchedule {
  [key: string]: TaskScheduleWithTask[]; // 日付をキーとする
}

// AI見積もりリクエスト用の型
export interface EstimateRequest {
  task: TaskInput;
  context?: string;
  chatHistory?: ChatMessage[];
}

// チャットメッセージの型
export interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export interface EstimateResponse {
  estimated_hours: number;
  /** @deprecated use estimated_hours instead */
  hours?: number; // 下位互換性のため
  confidence_score: number;
  reasoning: string;
  questions?: string[];
}

// 曜日の定義
export const DAYS_OF_WEEK = {
  1: '月曜日',
  2: '火曜日',
  3: '水曜日',
  4: '木曜日',
  5: '金曜日'
} as const;

export type DayOfWeek = keyof typeof DAYS_OF_WEEK;

// タスクステータス関連の定義
export type TaskStatus = 'pending' | 'in_progress' | 'on_hold' | 'review' | 'completed' | 'cancelled';

export const TASK_STATUS_LABELS = {
  pending: '未着手',
  in_progress: '進行中',
  on_hold: '保留中',
  review: 'レビュー待ち',
  completed: '完了',
  cancelled: 'キャンセル'
} as const;

export const TASK_STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  review: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
} as const;

// ユーザー設定関連の型定義
export interface UserSetting {
  id: number;
  setting_key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  work_start_time: string;
  work_end_time: string;
  daily_work_hours: number;
  theme: 'light' | 'dark' | 'system';
  compact_view: boolean;
  ai_enabled: boolean;
  notification_enabled: boolean;
}

export interface UserSettingInput {
  setting_key: string;
  value: string;
}

// カスタムカテゴリ関連の型定義
export interface CustomCategory {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CustomCategoryInput {
  name: string;
  color?: string;
}