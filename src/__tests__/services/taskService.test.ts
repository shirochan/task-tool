import { TaskService } from '@/lib/services/taskService';
import { cleanupDatabase, closeDatabase } from '@/lib/database/db';
import { mockTaskInput, mockTask } from '@/test-utils/fixtures';
import { Task, TaskInput } from '@/lib/types';

describe('TaskService', () => {
  let taskService: TaskService;

  beforeAll(() => {
    // テスト環境でNODE_ENVを設定
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    taskService = new TaskService();
    cleanupDatabase(); // 各テスト前にデータベースをクリーンアップ
  });

  afterAll(() => {
    closeDatabase(); // テスト完了後にデータベース接続を閉じる
  });

  describe('createTask', () => {
    it('should create a new task with valid input', () => {
      const taskInput: TaskInput = {
        title: 'テストタスク',
        description: 'テスト用のタスクです',
        priority: 'must',
        category: 'テスト',
        estimated_hours: 2.5,
        status: 'pending',
      };

      const createdTask = taskService.createTask(taskInput);

      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeTruthy();
      expect(createdTask.title).toBe(taskInput.title);
      expect(createdTask.description).toBe(taskInput.description);
      expect(createdTask.priority).toBe(taskInput.priority);
      expect(createdTask.category).toBe(taskInput.category);
      expect(createdTask.estimated_hours).toBe(taskInput.estimated_hours);
      expect(createdTask.status).toBe(taskInput.status);
      expect(createdTask.created_at).toBeTruthy();
      expect(createdTask.updated_at).toBeTruthy();
    });

    it('should create a task with minimal required fields', () => {
      const taskInput: TaskInput = {
        title: '最小限タスク',
        priority: 'want',
      };

      const createdTask = taskService.createTask(taskInput);

      expect(createdTask).toBeDefined();
      expect(createdTask.title).toBe(taskInput.title);
      expect(createdTask.priority).toBe(taskInput.priority);
      expect(createdTask.description).toBeNull();
      expect(createdTask.category).toBeNull();
      expect(createdTask.estimated_hours).toBeNull();
      expect(createdTask.status).toBe('pending'); // デフォルト値
    });

    it('should handle null/undefined optional fields', () => {
      const taskInput: TaskInput = {
        title: 'Nullフィールドタスク',
        description: undefined,
        priority: 'must',
        category: undefined,
        estimated_hours: undefined,
      };

      const createdTask = taskService.createTask(taskInput);

      expect(createdTask).toBeDefined();
      expect(createdTask.title).toBe(taskInput.title);
      expect(createdTask.description).toBeNull();
      expect(createdTask.category).toBeNull();
      expect(createdTask.estimated_hours).toBeNull();
    });
  });

  describe('getTaskById', () => {
    it('should return a task when it exists', () => {
      // まずタスクを作成
      const createdTask = taskService.createTask(mockTaskInput);
      
      // 作成したタスクを取得
      const retrievedTask = taskService.getTaskById(createdTask.id);

      expect(retrievedTask).toBeDefined();
      expect(retrievedTask!.id).toBe(createdTask.id);
      expect(retrievedTask!.title).toBe(createdTask.title);
    });

    it('should return null when task does not exist', () => {
      const retrievedTask = taskService.getTaskById(999);
      expect(retrievedTask).toBeNull();
    });

    it('should return null for invalid ID', () => {
      const retrievedTask = taskService.getTaskById(-1);
      expect(retrievedTask).toBeNull();
    });
  });

  describe('getAllTasks', () => {
    it('should return empty array when no tasks exist', () => {
      const tasks = taskService.getAllTasks();
      expect(tasks).toEqual([]);
    });

    it('should return all tasks when they exist', () => {
      // 複数のタスクを作成
      const task1 = taskService.createTask({ title: 'タスク1', priority: 'must' });
      const task2 = taskService.createTask({ title: 'タスク2', priority: 'want' });
      const task3 = taskService.createTask({ title: 'タスク3', priority: 'must' });

      const tasks = taskService.getAllTasks();

      expect(tasks).toHaveLength(3);
      expect(tasks.map(t => t.id)).toContain(task1.id);
      expect(tasks.map(t => t.id)).toContain(task2.id);
      expect(tasks.map(t => t.id)).toContain(task3.id);
    });

    it('should return tasks ordered by created_at DESC', () => {
      // 時間差でタスクを作成
      const task1 = taskService.createTask({ title: '古いタスク', priority: 'must' });
      
      // 少し時間を空ける（実際のテストでは必要に応じてmockDateを使用）
      const task2 = taskService.createTask({ title: '新しいタスク', priority: 'want' });

      const tasks = taskService.getAllTasks();

      expect(tasks).toHaveLength(2);
      // 新しいタスクが最初に来る（降順）
      expect(tasks[0].id).toBe(task2.id);
      expect(tasks[1].id).toBe(task1.id);
    });
  });

  describe('updateTask', () => {
    it('should update an existing task', () => {
      // まずタスクを作成
      const createdTask = taskService.createTask(mockTaskInput);
      
      // 更新データ
      const updateData: Partial<TaskInput> = {
        title: '更新されたタスク',
        priority: 'want',
        status: 'in_progress',
      };

      const updatedTask = taskService.updateTask(createdTask.id, updateData);

      expect(updatedTask).toBeDefined();
      expect(updatedTask!.id).toBe(createdTask.id);
      expect(updatedTask!.title).toBe(updateData.title);
      expect(updatedTask!.priority).toBe(updateData.priority);
      expect(updatedTask!.status).toBe(updateData.status);
      // 変更されていないフィールドは元の値を保持
      expect(updatedTask!.description).toBe(createdTask.description);
      expect(updatedTask!.category).toBe(createdTask.category);
    });

    it('should return null when updating non-existent task', () => {
      const updateData: Partial<TaskInput> = {
        title: '存在しないタスク',
      };

      const updatedTask = taskService.updateTask(999, updateData);
      expect(updatedTask).toBeNull();
    });

    it('should handle partial updates correctly', () => {
      const createdTask = taskService.createTask(mockTaskInput);
      
      // タイトルのみ更新
      const updateData: Partial<TaskInput> = {
        title: '部分更新タスク',
      };

      const updatedTask = taskService.updateTask(createdTask.id, updateData);

      expect(updatedTask).toBeDefined();
      expect(updatedTask!.title).toBe(updateData.title);
      // 他のフィールドは変更されていない
      expect(updatedTask!.priority).toBe(createdTask.priority);
      expect(updatedTask!.description).toBe(createdTask.description);
      expect(updatedTask!.category).toBe(createdTask.category);
    });
  });

  describe('deleteTask', () => {
    it('should delete an existing task', () => {
      // まずタスクを作成
      const createdTask = taskService.createTask(mockTaskInput);
      
      // タスクが存在することを確認
      expect(taskService.getTaskById(createdTask.id)).toBeDefined();

      // タスクを削除
      const deleted = taskService.deleteTask(createdTask.id);
      expect(deleted).toBe(true);

      // タスクが削除されていることを確認
      expect(taskService.getTaskById(createdTask.id)).toBeNull();
    });

    it('should return false when deleting non-existent task', () => {
      const deleted = taskService.deleteTask(999);
      expect(deleted).toBe(false);
    });

    it('should handle deleting already deleted task', () => {
      const createdTask = taskService.createTask(mockTaskInput);
      
      // 一度削除
      expect(taskService.deleteTask(createdTask.id)).toBe(true);
      
      // 再度削除を試行
      expect(taskService.deleteTask(createdTask.id)).toBe(false);
    });
  });
});