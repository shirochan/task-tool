import { GET } from '@/app/api/schedule/route';
import { TaskService } from '@/lib/services/taskService';
import { cleanupDatabase, closeDatabase } from '@/lib/database/db';
import { mockTaskSchedule } from '@/test-utils/fixtures';

// TaskServiceをモック
jest.mock('@/lib/services/taskService', () => ({
  TaskService: jest.fn().mockImplementation(() => ({
    generateWeeklySchedule: jest.fn(),
  })),
}));

describe('/api/schedule', () => {
  const mockTaskService = TaskService as jest.MockedClass<typeof TaskService>;
  let mockGenerateWeeklySchedule: jest.MockedFunction<any>;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateWeeklySchedule = jest.fn();
    mockTaskService.mockImplementation(() => ({
      generateWeeklySchedule: mockGenerateWeeklySchedule,
    } as any));
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('GET /api/schedule', () => {
    it('should return weekly schedule successfully', async () => {
      const mockWeeklySchedule = {
        '2024-01-01': [mockTaskSchedule],
        '2024-01-02': [],
        '2024-01-03': [],
        '2024-01-04': [],
        '2024-01-05': [],
      };
      mockGenerateWeeklySchedule.mockReturnValue(mockWeeklySchedule);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockWeeklySchedule);
      expect(mockGenerateWeeklySchedule).toHaveBeenCalledTimes(1);
    });

    it('should return empty weekly schedule when no tasks scheduled', async () => {
      const emptyWeeklySchedule = {
        '2024-01-01': [],
        '2024-01-02': [],
        '2024-01-03': [],
        '2024-01-04': [],
        '2024-01-05': [],
      };
      mockGenerateWeeklySchedule.mockReturnValue(emptyWeeklySchedule);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(emptyWeeklySchedule);
      expect(mockGenerateWeeklySchedule).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors gracefully', async () => {
      mockGenerateWeeklySchedule.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'スケジュールの取得に失敗しました' });
      expect(mockGenerateWeeklySchedule).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined return value from service', async () => {
      mockGenerateWeeklySchedule.mockReturnValue(undefined);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeUndefined();
      expect(mockGenerateWeeklySchedule).toHaveBeenCalledTimes(1);
    });

    it('should handle complex weekly schedule with multiple tasks', async () => {
      const complexWeeklySchedule = {
        '2024-01-01': [
          { ...mockTaskSchedule, id: 1, title: 'タスク1', start_time: '09:00' },
          { ...mockTaskSchedule, id: 2, title: 'タスク2', start_time: '14:00' },
        ],
        '2024-01-02': [
          { ...mockTaskSchedule, id: 3, title: 'タスク3', start_time: '10:00' },
        ],
        '2024-01-03': [],
        '2024-01-04': [
          { ...mockTaskSchedule, id: 4, title: 'タスク4', start_time: '13:00' },
        ],
        '2024-01-05': [],
      };
      mockGenerateWeeklySchedule.mockReturnValue(complexWeeklySchedule);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(complexWeeklySchedule);
      expect(Object.keys(data)).toHaveLength(5);
      expect(data['2024-01-01']).toHaveLength(2);
      expect(data['2024-01-02']).toHaveLength(1);
      expect(data['2024-01-03']).toHaveLength(0);
      expect(mockGenerateWeeklySchedule).toHaveBeenCalledTimes(1);
    });

    it('should create new TaskService instance for each request', async () => {
      mockGenerateWeeklySchedule.mockReturnValue({});

      await GET();
      await GET();

      expect(mockTaskService).toHaveBeenCalledTimes(2);
      expect(mockGenerateWeeklySchedule).toHaveBeenCalledTimes(2);
    });

    it('should handle service returning null', async () => {
      mockGenerateWeeklySchedule.mockReturnValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeNull();
      expect(mockGenerateWeeklySchedule).toHaveBeenCalledTimes(1);
    });
  });
});