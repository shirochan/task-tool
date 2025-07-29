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

  describe('Schedule Management', () => {
    let testTask: Task;

    beforeEach(() => {
      testTask = taskService.createTask({
        title: 'スケジュールテストタスク',
        priority: 'must',
        estimated_hours: 2.5
      });
    });

    describe('createTaskSchedule', () => {
      it('should create a task schedule successfully', () => {
        const date = '2024-01-01';
        const dayOfWeek = 1; // 月曜日
        const startTime = '09:00';
        const endTime = '11:30';

        taskService.createTaskSchedule(testTask.id, dayOfWeek, startTime, endTime, date);

        const schedules = taskService.getScheduleByDate(date);
        expect(schedules).toHaveLength(1);
        expect(schedules[0].task_id).toBe(testTask.id);
        expect(schedules[0].day_of_week).toBe(dayOfWeek);
        expect(schedules[0].start_time).toBe(startTime);
        expect(schedules[0].end_time).toBe(endTime);
        expect(schedules[0].scheduled_date).toBe(date);
      });
    });

    describe('getScheduleByDate', () => {
      it('should return empty array when no schedules exist for date', () => {
        const schedules = taskService.getScheduleByDate('2024-01-01');
        expect(schedules).toEqual([]);
      });

      it('should return schedules for specific date', () => {
        const date = '2024-01-01';
        taskService.createTaskSchedule(testTask.id, 1, '09:00', '11:30', date);

        const schedules = taskService.getScheduleByDate(date);
        expect(schedules).toHaveLength(1);
        expect(schedules[0].title).toBe(testTask.title);
        expect(schedules[0].scheduled_date).toBe(date);
      });

      it('should return multiple schedules ordered by start_time', () => {
        const date = '2024-01-01';
        const task2 = taskService.createTask({ title: 'タスク2', priority: 'want' });

        taskService.createTaskSchedule(testTask.id, 1, '14:00', '16:30', date);
        taskService.createTaskSchedule(task2.id, 1, '09:00', '11:00', date);

        const schedules = taskService.getScheduleByDate(date);
        expect(schedules).toHaveLength(2);
        expect(schedules[0].start_time).toBe('09:00');
        expect(schedules[1].start_time).toBe('14:00');
      });
    });

    describe('getWeeklySchedule', () => {
      it('should return empty array when no schedules exist for week', () => {
        const schedules = taskService.getWeeklySchedule('2024-01-01', '2024-01-05');
        expect(schedules).toEqual([]);
      });

      it('should return weekly schedules within date range', () => {
        taskService.createTaskSchedule(testTask.id, 1, '09:00', '11:30', '2024-01-01');
        taskService.createTaskSchedule(testTask.id, 3, '14:00', '16:30', '2024-01-03');

        const schedules = taskService.getWeeklySchedule('2024-01-01', '2024-01-05');
        expect(schedules).toHaveLength(2);
        expect(schedules[0].scheduled_date).toBe('2024-01-01');
        expect(schedules[1].scheduled_date).toBe('2024-01-03');
      });

      it('should order schedules by day_of_week and start_time', () => {
        taskService.createTaskSchedule(testTask.id, 3, '14:00', '16:30', '2024-01-03');
        taskService.createTaskSchedule(testTask.id, 1, '09:00', '11:30', '2024-01-01');
        taskService.createTaskSchedule(testTask.id, 1, '14:00', '16:00', '2024-01-01');

        const schedules = taskService.getWeeklySchedule('2024-01-01', '2024-01-05');
        expect(schedules).toHaveLength(3);
        expect(schedules[0].day_of_week).toBe(1);
        expect(schedules[0].start_time).toBe('09:00');
        expect(schedules[1].day_of_week).toBe(1);
        expect(schedules[1].start_time).toBe('14:00');
        expect(schedules[2].day_of_week).toBe(3);
      });
    });

    describe('generateWeeklySchedule', () => {
      it('should generate current week schedule structure', () => {
        const weeklySchedule = taskService.generateWeeklySchedule();
        
        // 5つの曜日分のキーが存在することを確認
        const keys = Object.keys(weeklySchedule);
        expect(keys).toHaveLength(5);
        
        // 各キーが有効な日付形式であることを確認
        keys.forEach(key => {
          expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(Array.isArray(weeklySchedule[key])).toBe(true);
        });
      });

      it('should include scheduled tasks in correct dates', () => {
        // 今週の月曜日の日付を取得
        const mondayDate = new Date();
        const monday = new Date(mondayDate.setDate(mondayDate.getDate() - (mondayDate.getDay() + 6) % 7));
        const mondayStr = monday.toISOString().split('T')[0];

        taskService.createTaskSchedule(testTask.id, 1, '09:00', '11:30', mondayStr);

        const weeklySchedule = taskService.generateWeeklySchedule();
        expect(weeklySchedule[mondayStr]).toHaveLength(1);
        expect(weeklySchedule[mondayStr][0].title).toBe(testTask.title);
      });
    });

    describe('moveTaskToDate', () => {
      it('should move task to new date successfully', () => {
        // 元のスケジュールを作成
        taskService.createTaskSchedule(testTask.id, 1, '09:00', '11:30', '2024-01-01');
        
        // タスクを移動
        const result = taskService.moveTaskToDate(testTask.id, '2024-01-03', '14:00');
        expect(result).toBe(true);

        // 元の日付にスケジュールが残っていないことを確認
        const oldSchedules = taskService.getScheduleByDate('2024-01-01');
        expect(oldSchedules).toHaveLength(0);

        // 新しい日付にスケジュールが作成されていることを確認
        const newSchedules = taskService.getScheduleByDate('2024-01-03');
        expect(newSchedules).toHaveLength(1);
        expect(newSchedules[0].task_id).toBe(testTask.id);
        expect(newSchedules[0].scheduled_date).toBe('2024-01-03');
        expect(newSchedules[0].start_time).toBe('14:00');
      });

      it('should calculate end time based on estimated hours', () => {
        const result = taskService.moveTaskToDate(testTask.id, '2024-01-03', '10:00');
        expect(result).toBe(true);

        const schedules = taskService.getScheduleByDate('2024-01-03');
        expect(schedules[0].start_time).toBe('10:00');
        expect(schedules[0].end_time).toBe('12:30'); // 10:00 + 2.5時間 = 12:30
      });

      it('should use default start time when not provided', () => {
        const result = taskService.moveTaskToDate(testTask.id, '2024-01-03');
        expect(result).toBe(true);

        const schedules = taskService.getScheduleByDate('2024-01-03');
        expect(schedules[0].start_time).toBe('10:00');
      });

      it('should reject weekend dates', () => {
        const result = taskService.moveTaskToDate(testTask.id, '2024-01-06'); // 土曜日
        expect(result).toBe(false);

        const schedules = taskService.getScheduleByDate('2024-01-06');
        expect(schedules).toHaveLength(0);
      });

      it('should handle task without estimated hours', () => {
        const taskWithoutHours = taskService.createTask({
          title: '時間未設定タスク',
          priority: 'want'
        });

        const result = taskService.moveTaskToDate(taskWithoutHours.id, '2024-01-03', '09:00');
        expect(result).toBe(true);

        const schedules = taskService.getScheduleByDate('2024-01-03');
        expect(schedules[0].end_time).toBe('10:00'); // デフォルト1時間
      });
    });

    describe('updateTaskSchedule', () => {
      let scheduleId: number;

      beforeEach(() => {
        taskService.createTaskSchedule(testTask.id, 1, '09:00', '11:30', '2024-01-01');
        const schedules = taskService.getScheduleByDate('2024-01-01');
        scheduleId = schedules[0].id;
      });

      it('should update schedule start time', () => {
        const result = taskService.updateTaskSchedule(scheduleId, { start_time: '10:00' });
        expect(result).toBe(true);

        const schedules = taskService.getScheduleByDate('2024-01-01');
        expect(schedules[0].start_time).toBe('10:00');
        expect(schedules[0].end_time).toBe('11:30'); // 変更されない
      });

      it('should update schedule end time', () => {
        const result = taskService.updateTaskSchedule(scheduleId, { end_time: '12:00' });
        expect(result).toBe(true);

        const schedules = taskService.getScheduleByDate('2024-01-01');
        expect(schedules[0].end_time).toBe('12:00');
        expect(schedules[0].start_time).toBe('09:00'); // 変更されない
      });

      it('should update schedule date', () => {
        const result = taskService.updateTaskSchedule(scheduleId, { scheduled_date: '2024-01-02' });
        expect(result).toBe(true);

        const oldSchedules = taskService.getScheduleByDate('2024-01-01');
        expect(oldSchedules).toHaveLength(0);

        const newSchedules = taskService.getScheduleByDate('2024-01-02');
        expect(newSchedules).toHaveLength(1);
        expect(newSchedules[0].scheduled_date).toBe('2024-01-02');
      });

      it('should return false for non-existent schedule', () => {
        const result = taskService.updateTaskSchedule(99999, { start_time: '10:00' });
        expect(result).toBe(false);
      });
    });

    describe('checkTimeConflicts', () => {
      beforeEach(() => {
        taskService.createTaskSchedule(testTask.id, 1, '09:00', '11:00', '2024-01-01');
      });

      it('should detect time conflicts', () => {
        const hasConflict = taskService.checkTimeConflicts('2024-01-01', '10:00', '12:00');
        expect(hasConflict).toBe(true);
      });

      it('should not detect conflicts for non-overlapping times', () => {
        const hasConflict = taskService.checkTimeConflicts('2024-01-01', '11:00', '13:00');
        expect(hasConflict).toBe(false);
      });

      it('should exclude specified task from conflict check', () => {
        const hasConflict = taskService.checkTimeConflicts('2024-01-01', '09:30', '10:30', testTask.id);
        expect(hasConflict).toBe(false);
      });

      it('should not detect conflicts on different dates', () => {
        const hasConflict = taskService.checkTimeConflicts('2024-01-02', '09:00', '11:00');
        expect(hasConflict).toBe(false);
      });
    });

    describe('clearWeeklySchedule', () => {
      beforeEach(() => {
        taskService.createTaskSchedule(testTask.id, 1, '09:00', '11:00', '2024-01-01');
        taskService.createTaskSchedule(testTask.id, 2, '14:00', '16:00', '2024-01-02');
        taskService.createTaskSchedule(testTask.id, 1, '10:00', '12:00', '2024-01-08');
      });

      it('should clear schedules within date range', () => {
        taskService.clearWeeklySchedule('2024-01-01', '2024-01-05');

        const week1Schedules = taskService.getWeeklySchedule('2024-01-01', '2024-01-05');
        expect(week1Schedules).toHaveLength(0);

        // 範囲外のスケジュールは残る
        const week2Schedules = taskService.getScheduleByDate('2024-01-08');
        expect(week2Schedules).toHaveLength(1);
      });
    });

    describe('updateWeeklyScheduleAtomically', () => {
      it('should update weekly schedule atomically', () => {
        const scheduleData = [
          { taskId: testTask.id, dayOfWeek: 1, startTime: '09:00', endTime: '11:00', scheduledDate: '2024-01-01' },
          { taskId: testTask.id, dayOfWeek: 2, startTime: '14:00', endTime: '16:00', scheduledDate: '2024-01-02' }
        ];

        taskService.updateWeeklyScheduleAtomically('2024-01-01', '2024-01-05', scheduleData);

        const weeklySchedules = taskService.getWeeklySchedule('2024-01-01', '2024-01-05');
        expect(weeklySchedules).toHaveLength(2);
        expect(weeklySchedules[0].scheduled_date).toBe('2024-01-01');
        expect(weeklySchedules[1].scheduled_date).toBe('2024-01-02');
      });

      it('should clear existing schedules before adding new ones', () => {
        // 既存スケジュール作成
        taskService.createTaskSchedule(testTask.id, 3, '10:00', '12:00', '2024-01-03');

        const scheduleData = [
          { taskId: testTask.id, dayOfWeek: 1, startTime: '09:00', endTime: '11:00', scheduledDate: '2024-01-01' }
        ];

        taskService.updateWeeklyScheduleAtomically('2024-01-01', '2024-01-05', scheduleData);

        const weeklySchedules = taskService.getWeeklySchedule('2024-01-01', '2024-01-05');
        expect(weeklySchedules).toHaveLength(1);
        expect(weeklySchedules[0].scheduled_date).toBe('2024-01-01');
      });
    });
  });
});