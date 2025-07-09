import { statements } from '../database/db';
import { Task, TaskInput, TaskScheduleWithTask, AIEstimate, AIEstimateInput } from '../types';

export class TaskService {
  // タスク管理
  static createTask(taskInput: TaskInput): Task {
    const result = statements.insertTask.run(
      taskInput.title,
      taskInput.description || null,
      taskInput.priority,
      taskInput.category || null,
      taskInput.estimated_hours || null
    );
    
    return statements.getTaskById.get(result.lastInsertRowid) as Task;
  }

  static getTaskById(id: number): Task | null {
    return statements.getTaskById.get(id) as Task | null;
  }

  static getAllTasks(): Task[] {
    return statements.getAllTasks.all() as Task[];
  }

  static updateTask(id: number, taskInput: Partial<TaskInput>): Task | null {
    const existingTask = statements.getTaskById.get(id) as Task | null;
    if (!existingTask) return null;

    statements.updateTask.run(
      taskInput.title ?? existingTask.title,
      taskInput.description ?? existingTask.description,
      taskInput.priority ?? existingTask.priority,
      taskInput.category ?? existingTask.category,
      taskInput.estimated_hours ?? existingTask.estimated_hours,
      id
    );

    return statements.getTaskById.get(id) as Task;
  }

  static deleteTask(id: number): boolean {
    const result = statements.deleteTask.run(id);
    return result.changes > 0;
  }

  // スケジュール管理
  static createTaskSchedule(taskId: number, dayOfWeek: number, startTime: string, endTime: string, scheduledDate: string): void {
    statements.insertTaskSchedule.run(taskId, dayOfWeek, startTime, endTime, scheduledDate);
  }

  static getScheduleByDate(date: string): TaskScheduleWithTask[] {
    return statements.getScheduleByDate.all(date) as TaskScheduleWithTask[];
  }

  static getWeeklySchedule(startDate: string, endDate: string): TaskScheduleWithTask[] {
    return statements.getWeeklySchedule.all(startDate, endDate) as TaskScheduleWithTask[];
  }

  // AI見積もり管理
  static createAIEstimate(estimate: AIEstimateInput): AIEstimate {
    statements.insertAIEstimate.run(
      estimate.task_id,
      estimate.estimated_hours,
      estimate.confidence_score || null,
      estimate.reasoning || null,
      estimate.questions_asked ? JSON.stringify(estimate.questions_asked) : null
    );

    return statements.getLatestEstimate.get(estimate.task_id) as AIEstimate;
  }

  static getLatestEstimate(taskId: number): AIEstimate | null {
    return statements.getLatestEstimate.get(taskId) as AIEstimate | null;
  }

  // 週間スケジュールクリア
  static clearWeeklySchedule(startDate: string, endDate: string): void {
    statements.clearWeeklySchedule.run(startDate, endDate);
  }

  // 週間スケジュール生成用のヘルパー関数
  static generateWeeklySchedule(): { [key: string]: TaskScheduleWithTask[] } {
    // 現在の週の月曜日から金曜日までの日付を取得
    const today = new Date();
    const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    
    const weekDates: string[] = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push(date.toISOString().split('T')[0]);
    }

    // 各日のスケジュールを取得
    const weeklySchedule: { [key: string]: TaskScheduleWithTask[] } = {};
    weekDates.forEach(date => {
      weeklySchedule[date] = this.getScheduleByDate(date);
    });

    return weeklySchedule;
  }
}