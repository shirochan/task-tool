// データベース型定義

export interface Task {
  id: number;
  title: string;
  description?: string;
  priority: 'must' | 'want';
  category?: string;
  estimated_hours?: number;
  actual_hours?: number;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  priority: 'must' | 'want';
  category?: string;
  estimated_hours?: number;
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
  estimated_hours?: number;
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
}

export interface EstimateResponse {
  estimated_hours: number;
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