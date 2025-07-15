import { statements, runTransaction } from '../database/db';
import { Task, TaskInput, TaskScheduleWithTask, AIEstimate, AIEstimateInput, UserSetting, CustomCategory, CustomCategoryInput } from '../types';
import { getISOWeekDates } from '../utils';

export class TaskService {
  // タスク管理
  createTask(taskInput: TaskInput): Task {
    const result = statements.insertTask.run(
      taskInput.title,
      taskInput.description || null,
      taskInput.priority,
      taskInput.category || null,
      taskInput.estimated_hours || null,
      taskInput.status || 'pending'
    );
    
    return statements.getTaskById.get(result.lastInsertRowid) as Task;
  }

  getTaskById(id: number): Task | null {
    return statements.getTaskById.get(id) as Task | null;
  }

  getAllTasks(): Task[] {
    return statements.getAllTasks.all() as Task[];
  }

  updateTask(id: number, taskInput: Partial<TaskInput>): Task | null {
    const existingTask = statements.getTaskById.get(id) as Task | null;
    if (!existingTask) return null;

    statements.updateTask.run(
      taskInput.title ?? existingTask.title,
      taskInput.description ?? existingTask.description,
      taskInput.priority ?? existingTask.priority,
      taskInput.category ?? existingTask.category,
      taskInput.estimated_hours ?? existingTask.estimated_hours,
      taskInput.status ?? existingTask.status,
      id
    );

    return statements.getTaskById.get(id) as Task;
  }

  deleteTask(id: number): boolean {
    const result = statements.deleteTask.run(id);
    return result.changes > 0;
  }

  // スケジュール管理
  createTaskSchedule(taskId: number, dayOfWeek: number, startTime: string, endTime: string, scheduledDate: string): void {
    statements.insertTaskSchedule.run(taskId, dayOfWeek, startTime, endTime, scheduledDate);
  }

  getScheduleByDate(date: string): TaskScheduleWithTask[] {
    return statements.getScheduleByDate.all(date) as TaskScheduleWithTask[];
  }

  getWeeklySchedule(startDate: string, endDate: string): TaskScheduleWithTask[] {
    return statements.getWeeklySchedule.all(startDate, endDate) as TaskScheduleWithTask[];
  }

  // AI見積もり管理
  createAIEstimate(estimate: AIEstimateInput): AIEstimate {
    statements.insertAIEstimate.run(
      estimate.task_id,
      estimate.estimated_hours,
      estimate.confidence_score || null,
      estimate.reasoning || null,
      estimate.questions_asked ? JSON.stringify(estimate.questions_asked) : null
    );

    return statements.getLatestEstimate.get(estimate.task_id) as AIEstimate;
  }

  getLatestEstimate(taskId: number): AIEstimate | null {
    return statements.getLatestEstimate.get(taskId) as AIEstimate | null;
  }

  // 週間スケジュールクリア
  clearWeeklySchedule(startDate: string, endDate: string): void {
    statements.clearWeeklySchedule.run(startDate, endDate);
  }

  // トランザクション内でスケジュールを更新（原子性を保証）
  updateWeeklyScheduleAtomically(
    startDate: string,
    endDate: string,
    scheduleData: Array<{ taskId: number; dayOfWeek: number; startTime: string; endTime: string; scheduledDate: string }>
  ): void {
    runTransaction(() => {
      // 既存スケジュールをクリア
      statements.clearWeeklySchedule.run(startDate, endDate);
      
      // 新しいスケジュールを追加
      for (const schedule of scheduleData) {
        statements.insertTaskSchedule.run(
          schedule.taskId,
          schedule.dayOfWeek,
          schedule.startTime,
          schedule.endTime,
          schedule.scheduledDate
        );
      }
    });
  }

  // 週間スケジュール生成用のヘルパー関数
  generateWeeklySchedule(): { [key: string]: TaskScheduleWithTask[] } {
    // 現在の週の月曜日から金曜日までの日付を取得
    const weekDates = getISOWeekDates();

    // 各日のスケジュールを取得
    const weeklySchedule: { [key: string]: TaskScheduleWithTask[] } = {};
    weekDates.forEach(date => {
      weeklySchedule[date] = this.getScheduleByDate(date);
    });

    return weeklySchedule;
  }

  // ドラッグ＆ドロップ用のタスク移動
  moveTaskToDate(taskId: number, targetDate: string, targetTime?: string): boolean {
    return runTransaction(() => {
      // 既存のスケジュールを削除
      statements.deleteTaskSchedule.run(taskId);
      
      // 新しい日付でスケジュールを作成
      const dayOfWeek = new Date(targetDate).getDay();
      // 日曜日(0)を7に変換し、月曜日(1)から金曜日(5)のみ許可
      const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      
      if (adjustedDayOfWeek >= 1 && adjustedDayOfWeek <= 5) {
        const startTime = targetTime || '10:00';
        const task = this.getTaskById(taskId);
        const estimatedHours = task?.estimated_hours || 1;
        
        // 終了時間を計算（分のオーバーフロー処理）
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const totalMinutes = startMinute + ((estimatedHours % 1) * 60);
        const endHour = startHour + Math.floor(estimatedHours) + Math.floor(totalMinutes / 60);
        const endMinute = Math.round(totalMinutes % 60);
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        statements.insertTaskSchedule.run(
          taskId,
          adjustedDayOfWeek,
          startTime,
          endTime,
          targetDate
        );
        return true;
      }
      return false;
    });
  }

  // 個別スケジュールの更新
  updateTaskSchedule(scheduleId: number, updates: {
    start_time?: string;
    end_time?: string;
    scheduled_date?: string;
  }): boolean {
    return runTransaction(() => {
      const result = statements.updateTaskSchedule.run(
        updates.start_time,
        updates.end_time,
        updates.scheduled_date,
        scheduleId
      );
      return result.changes > 0;
    });
  }

  // 時間競合チェック
  checkTimeConflicts(date: string, startTime: string, endTime: string, excludeTaskId?: number): boolean {
    const schedules = this.getScheduleByDate(date);
    
    for (const schedule of schedules) {
      if (excludeTaskId && schedule.task_id === excludeTaskId) continue;
      
      const existingStart = schedule.start_time;
      const existingEnd = schedule.end_time;
      
      // 時間の重複チェック（時間が設定されている場合のみ）
      if (existingStart && existingEnd && startTime < existingEnd && endTime > existingStart) {
        return true; // 競合あり
      }
    }
    return false; // 競合なし
  }

  // ユーザー設定管理
  getAllSettings(): UserSetting[] {
    return statements.getAllSettings.all() as UserSetting[];
  }

  getSetting(key: string): UserSetting | null {
    return statements.getSetting.get(key) as UserSetting | null;
  }

  upsertSetting(key: string, value: string): UserSetting {
    return runTransaction(() => {
      statements.upsertSetting.run(key, value);
      return statements.getSetting.get(key) as UserSetting;
    });
  }

  deleteSetting(key: string): boolean {
    const result = statements.deleteSetting.run(key);
    return result.changes > 0;
  }

  // カスタムカテゴリ管理
  getAllCategories(): CustomCategory[] {
    return statements.getAllCategories.all() as CustomCategory[];
  }

  getCategoryById(id: number): CustomCategory | null {
    return statements.getCategoryById.get(id) as CustomCategory | null;
  }

  createCategory(categoryInput: CustomCategoryInput): CustomCategory {
    const result = statements.insertCategory.run(
      categoryInput.name,
      categoryInput.color || '#3b82f6'
    );
    
    return statements.getCategoryById.get(result.lastInsertRowid) as CustomCategory;
  }

  updateCategory(id: number, categoryInput: CustomCategoryInput): CustomCategory | null {
    const existingCategory = statements.getCategoryById.get(id) as CustomCategory | null;
    if (!existingCategory) return null;

    statements.updateCategory.run(
      categoryInput.name,
      categoryInput.color || existingCategory.color,
      id
    );

    return statements.getCategoryById.get(id) as CustomCategory;
  }

  deleteCategory(id: number): boolean {
    const result = statements.deleteCategory.run(id);
    return result.changes > 0;
  }
}