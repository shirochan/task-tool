import { GET, POST } from '@/app/api/tasks/route';
import { TaskService } from '@/lib/services/taskService';
import { cleanupDatabase, closeDatabase } from '@/lib/database/db';
import { mockTaskInput, mockTask } from '@/test-utils/fixtures';
import { NextRequest } from 'next/server';

// TaskServiceをモック
jest.mock('@/lib/services/taskService');

describe('/api/tasks', () => {
  let mockTaskService: jest.Mocked<TaskService>;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    // TaskServiceのモックをクリア
    jest.clearAllMocks();
    mockTaskService = {
      createTask: jest.fn(),
      getAllTasks: jest.fn(),
      getTaskById: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
    } as any;
    (TaskService as jest.MockedClass<typeof TaskService>).mockImplementation(() => mockTaskService);
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('GET /api/tasks', () => {
    it('should return all tasks successfully', async () => {
      const mockTasks = [mockTask];
      mockTaskService.getAllTasks.mockReturnValue(mockTasks);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTasks);
      expect(mockTaskService.getAllTasks).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no tasks exist', async () => {
      mockTaskService.getAllTasks.mockReturnValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
      expect(mockTaskService.getAllTasks).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors gracefully', async () => {
      mockTaskService.getAllTasks.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'タスクの取得に失敗しました' });
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const createdTask = { ...mockTask, id: 1 };
      mockTaskService.createTask.mockReturnValue(createdTask);

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(mockTaskInput),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(createdTask);
      expect(mockTaskService.createTask).toHaveBeenCalledWith(mockTaskInput);
    });

    it('should validate required title field', async () => {
      const invalidInput = { ...mockTaskInput, title: '' };

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(invalidInput),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'タイトルは必須です' });
      expect(mockTaskService.createTask).not.toHaveBeenCalled();
    });

    it('should validate title is a string', async () => {
      const invalidInput = { ...mockTaskInput, title: 123 };

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(invalidInput),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'タイトルは必須です' });
      expect(mockTaskService.createTask).not.toHaveBeenCalled();
    });

    it('should validate title is not empty after trimming', async () => {
      const invalidInput = { ...mockTaskInput, title: '   ' };

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(invalidInput),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'タイトルは必須です' });
      expect(mockTaskService.createTask).not.toHaveBeenCalled();
    });

    it('should validate priority field', async () => {
      const invalidInput = { ...mockTaskInput, priority: 'invalid' as any };

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(invalidInput),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: '無効な優先度値です' });
      expect(mockTaskService.createTask).not.toHaveBeenCalled();
    });

    it('should accept valid must priority', async () => {
      const validInput = { ...mockTaskInput, priority: 'must' as const };
      const createdTask = { ...mockTask, priority: 'must' as const };
      mockTaskService.createTask.mockReturnValue(createdTask);

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(validInput),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.priority).toBe('must');
      expect(mockTaskService.createTask).toHaveBeenCalledWith(validInput);
    });

    it('should accept valid want priority', async () => {
      const validInput = { ...mockTaskInput, priority: 'want' as const };
      const createdTask = { ...mockTask, priority: 'want' as const };
      mockTaskService.createTask.mockReturnValue(createdTask);

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(validInput),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.priority).toBe('want');
      expect(mockTaskService.createTask).toHaveBeenCalledWith(validInput);
    });

    it('should handle optional fields correctly', async () => {
      const minimalInput = {
        title: '最小限のタスク',
        priority: 'must' as const,
      };
      const createdTask = {
        ...mockTask,
        title: '最小限のタスク',
        priority: 'must' as const,
        description: null,
        category: null,
        estimated_hours: null,
      };
      mockTaskService.createTask.mockReturnValue(createdTask);

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(minimalInput),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(mockTaskService.createTask).toHaveBeenCalledWith({
        title: '最小限のタスク',
        description: undefined,
        priority: 'must',
        category: undefined,
        estimated_hours: undefined,
        status: 'pending',
      });
    });

    it('should handle invalid JSON request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'タスクの作成に失敗しました' });
      expect(mockTaskService.createTask).not.toHaveBeenCalled();
    });

    it('should handle database errors during task creation', async () => {
      mockTaskService.createTask.mockImplementation(() => {
        throw new Error('Database constraint violation');
      });

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(mockTaskInput),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'タスクの作成に失敗しました' });
      expect(mockTaskService.createTask).toHaveBeenCalledWith(mockTaskInput);
    });

    it('should validate estimated_hours field type', async () => {
      const invalidInput = { ...mockTaskInput, estimated_hours: 'invalid' as any };

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(invalidInput),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: '見積もり時間は0以上の数値である必要があります' });
      expect(mockTaskService.createTask).not.toHaveBeenCalled();
    });

    it('should validate estimated_hours is not negative', async () => {
      const invalidInput = { ...mockTaskInput, estimated_hours: -1 };

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(invalidInput),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: '見積もり時間は0以上の数値である必要があります' });
      expect(mockTaskService.createTask).not.toHaveBeenCalled();
    });

    it('should validate status field', async () => {
      const invalidInput = { ...mockTaskInput, status: 'invalid' as any };

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(invalidInput),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: '無効なステータス値です' });
      expect(mockTaskService.createTask).not.toHaveBeenCalled();
    });

    it('should accept valid status values', async () => {
      const validStatuses = ['pending', 'in_progress', 'on_hold', 'review', 'completed', 'cancelled'];
      
      for (const status of validStatuses) {
        const validInput = { ...mockTaskInput, status: status as any };
        const createdTask = { ...mockTask, status: status as any };
        mockTaskService.createTask.mockReturnValue(createdTask);

        const request = new NextRequest('http://localhost:3000/api/tasks', {
          method: 'POST',
          body: JSON.stringify(validInput),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.status).toBe(status);
      }
    });
  });
});