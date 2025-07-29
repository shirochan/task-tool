import { Task, TaskInput, EstimateResponse, TaskScheduleWithTask } from '@/lib/types';

// テスト用のタスクデータ
export const mockTask: Task = {
  id: 1,
  title: 'テストタスク',
  description: 'テスト用のタスクです',
  priority: 'must',
  category: 'テスト',
  estimated_hours: 2.5,
  actual_hours: null,
  status: 'pending',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockTaskInput: TaskInput = {
  title: 'テストタスク',
  description: 'テスト用のタスクです',
  priority: 'must',
  category: 'テスト',
  estimated_hours: 2.5,
  status: 'pending',
};

export const mockTasks: Task[] = [
  mockTask,
  {
    id: 2,
    title: '別のテストタスク',
    description: '別のテスト用タスク',
    priority: 'want',
    category: '開発',
    estimated_hours: 1.0,
    actual_hours: null,
    status: 'in_progress',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 3,
    title: '完了済みタスク',
    description: '完了したタスク',
    priority: 'must',
    category: 'テスト',
    estimated_hours: 3.0,
    actual_hours: 2.8,
    status: 'completed',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
];

// AI見積もりレスポンス用のモックデータ
export const mockEstimateResponse: EstimateResponse = {
  estimated_hours: 2.5,
  confidence_score: 0.8,
  reasoning: 'このタスクは中程度の複雑さで、約2.5時間かかると推定されます。',
  questions: ['より詳細な仕様は必要ですか？', '使用する技術スタックは決まっていますか？'],
};

// タスクスケジュール用のモックデータ
export const mockTaskSchedule: TaskScheduleWithTask = {
  id: 1,
  task_id: 1,
  day_of_week: 1, // 月曜日
  start_time: '09:00',
  end_time: '11:30',
  scheduled_date: '2024-01-01',
  created_at: '2024-01-01T00:00:00Z',
  title: 'テストタスク',
  description: 'テスト用のタスクです',
  priority: 'must',
  category: 'テスト',
  estimated_hours: 2.5,
  actual_hours: null,
  status: 'pending',
  updated_at: '2024-01-01T00:00:00Z',
};

// エラーレスポンス用のモックデータ
export const mockErrorResponse = {
  error: 'テスト用エラーメッセージ',
};

// APIリクエスト用のモックデータ
export const mockApiRequest = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(mockTaskInput),
};

// テスト用のユーザー設定
export const mockUserSettings = {
  work_start_time: '09:00',
  work_end_time: '18:00',
  daily_work_hours: 8,
  theme: 'light' as const,
  compact_view: false,
  ai_enabled: true,
  notification_enabled: true,
};