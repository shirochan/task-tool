import { GET, POST } from '@/app/api/settings/route';
import { TaskService } from '@/lib/services/taskService';
import { closeDatabase } from '@/lib/database/db';
import { NextRequest } from 'next/server';

// TaskServiceをモック
jest.mock('@/lib/services/taskService', () => ({
  TaskService: jest.fn().mockImplementation(() => ({
    getAllSettings: jest.fn(),
    upsertSetting: jest.fn(),
  })),
}));

describe('/api/settings', () => {
  const mockTaskService = TaskService as jest.MockedClass<typeof TaskService>;
  let mockGetAllSettings: jest.MockedFunction<TaskService['getAllSettings']>;
  let mockUpsertSetting: jest.MockedFunction<TaskService['upsertSetting']>;

  const mockSettings = [
    {
      id: 1,
      setting_key: 'work_start_time',
      value: '09:00',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      setting_key: 'work_end_time',
      value: '18:00',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockSetting = {
    id: 1,
    setting_key: 'daily_work_hours',
    value: '8',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllSettings = jest.fn();
    mockUpsertSetting = jest.fn();
    mockTaskService.mockImplementation(() => ({
      getAllSettings: mockGetAllSettings,
      upsertSetting: mockUpsertSetting,
    } as unknown as TaskService));
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('GET /api/settings', () => {
    it('should return all settings successfully', async () => {
      mockGetAllSettings.mockResolvedValue(mockSettings);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSettings);
      expect(mockGetAllSettings).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no settings exist', async () => {
      mockGetAllSettings.mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
      expect(mockGetAllSettings).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors gracefully', async () => {
      mockGetAllSettings.mockRejectedValue(new Error('Database connection failed'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: '設定の取得に失敗しました' });
      expect(mockGetAllSettings).toHaveBeenCalledTimes(1);
    });

    it('should handle service returning null/undefined', async () => {
      mockGetAllSettings.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeNull();
      expect(mockGetAllSettings).toHaveBeenCalledTimes(1);
    });

    it('should create new TaskService instance for each request', async () => {
      mockGetAllSettings.mockResolvedValue([]);

      await GET();
      await GET();

      expect(mockTaskService).toHaveBeenCalledTimes(2);
      expect(mockGetAllSettings).toHaveBeenCalledTimes(2);
    });
  });

  describe('POST /api/settings', () => {
    it('should create/update setting successfully', async () => {
      mockUpsertSetting.mockResolvedValue(mockSetting);

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          setting_key: 'daily_work_hours',
          value: '8',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSetting);
      expect(mockUpsertSetting).toHaveBeenCalledWith('daily_work_hours', '8');
    });

    it('should validate required setting_key field', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          value: '8',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'キーと値が必要です' });
      expect(mockUpsertSetting).not.toHaveBeenCalled();
    });

    it('should validate required value field', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          setting_key: 'daily_work_hours',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'キーと値が必要です' });
      expect(mockUpsertSetting).not.toHaveBeenCalled();
    });

    it('should validate empty setting_key', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          setting_key: '',
          value: '8',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'キーと値が必要です' });
      expect(mockUpsertSetting).not.toHaveBeenCalled();
    });

    it('should validate empty value', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          setting_key: 'daily_work_hours',
          value: '',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'キーと値が必要です' });
      expect(mockUpsertSetting).not.toHaveBeenCalled();
    });

    it('should handle various setting types', async () => {
      const testCases = [
        { setting_key: 'work_start_time', value: '09:00' },
        { setting_key: 'work_end_time', value: '18:00' },
        { setting_key: 'daily_work_hours', value: '8' },
        { setting_key: 'theme', value: 'dark' },
        { setting_key: 'compact_view', value: 'true' },
        { setting_key: 'ai_enabled', value: 'false' },
      ];

      for (const testCase of testCases) {
        const expectedResponse = {
          ...mockSetting,
          setting_key: testCase.setting_key,
          value: testCase.value,
        };
        mockUpsertSetting.mockResolvedValue(expectedResponse);

        const request = new NextRequest('http://localhost:3000/api/settings', {
          method: 'POST',
          body: JSON.stringify(testCase),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(expectedResponse);
        expect(mockUpsertSetting).toHaveBeenCalledWith(testCase.setting_key, testCase.value);
      }
    });

    it('should handle service errors during upsert', async () => {
      mockUpsertSetting.mockRejectedValue(new Error('Database constraint violation'));

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          setting_key: 'daily_work_hours',
          value: '8',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: '設定の保存に失敗しました' });
      expect(mockUpsertSetting).toHaveBeenCalledWith('daily_work_hours', '8');
    });

    it('should handle invalid JSON request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: '設定の保存に失敗しました' });
      expect(mockUpsertSetting).not.toHaveBeenCalled();
    });

    it('should handle numeric values as strings', async () => {
      mockUpsertSetting.mockResolvedValue({
        ...mockSetting,
        setting_key: 'daily_work_hours',
        value: '8.5',
      });

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          setting_key: 'daily_work_hours',
          value: '8.5',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.value).toBe('8.5');
      expect(mockUpsertSetting).toHaveBeenCalledWith('daily_work_hours', '8.5');
    });

    it('should handle boolean values as strings', async () => {
      mockUpsertSetting.mockResolvedValue({
        ...mockSetting,
        setting_key: 'compact_view',
        value: 'true',
      });

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          setting_key: 'compact_view',
          value: 'true',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.value).toBe('true');
      expect(mockUpsertSetting).toHaveBeenCalledWith('compact_view', 'true');
    });

    it('should create new TaskService instance for each request', async () => {
      mockUpsertSetting.mockResolvedValue(mockSetting);

      const request1 = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          setting_key: 'key1',
          value: 'value1',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const request2 = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          setting_key: 'key2',
          value: 'value2',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await POST(request1);
      await POST(request2);

      expect(mockTaskService).toHaveBeenCalledTimes(2);
      expect(mockUpsertSetting).toHaveBeenCalledTimes(2);
    });
  });
});