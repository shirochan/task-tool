import { POST } from '@/app/api/estimate/route';
import { AIService } from '@/lib/services/aiService';
import { mockTaskInput, mockEstimateResponse } from '@/test-utils/fixtures';
import { NextRequest } from 'next/server';

// AIServiceをモック
jest.mock('@/lib/services/aiService', () => ({
  AIService: {
    estimateTask: jest.fn(),
  },
}));

describe('/api/estimate', () => {
  const mockEstimateTask = AIService.estimateTask as jest.MockedFunction<typeof AIService.estimateTask>;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    // AIServiceのモックをクリア
    jest.clearAllMocks();
  });

  describe('POST /api/estimate', () => {
    it('should return estimate successfully with valid task', async () => {
      mockEstimateTask.mockResolvedValue(mockEstimateResponse);

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        body: JSON.stringify({ task: mockTaskInput }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockEstimateResponse);
      expect(mockEstimateTask).toHaveBeenCalledWith({ task: mockTaskInput });
    });

    it('should return estimate with context when provided', async () => {
      const contextData = 'プロジェクトの追加コンテキスト';
      mockEstimateTask.mockResolvedValue(mockEstimateResponse);

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        body: JSON.stringify({ 
          task: mockTaskInput,
          context: contextData
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockEstimateResponse);
      expect(mockEstimateTask).toHaveBeenCalledWith({ 
        task: mockTaskInput,
        context: contextData
      });
    });

    it('should validate required task field', async () => {
      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'タスク情報が必要です' });
      expect(mockEstimateTask).not.toHaveBeenCalled();
    });

    it('should validate task.title field', async () => {
      const invalidTask = { ...mockTaskInput, title: '' };

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        body: JSON.stringify({ task: invalidTask }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'タスクのタイトルが必要です' });
      expect(mockEstimateTask).not.toHaveBeenCalled();
    });

    it('should validate task.title is not undefined', async () => {
      const invalidTask = { ...mockTaskInput };
      delete (invalidTask as any).title;

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        body: JSON.stringify({ task: invalidTask }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'タスクのタイトルが必要です' });
      expect(mockEstimateTask).not.toHaveBeenCalled();
    });

    it('should handle OpenAI API key not configured error', async () => {
      mockEstimateTask.mockRejectedValue(
        new Error('OpenAI API key is not configured')
      );

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        body: JSON.stringify({ task: mockTaskInput }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toEqual({ 
        error: 'OpenAI APIキーが設定されていません。設定を確認してください。' 
      });
      expect(mockEstimateTask).toHaveBeenCalledWith({ task: mockTaskInput });
    });

    it('should handle OpenAI API connection error', async () => {
      mockEstimateTask.mockRejectedValue(
        new Error('OpenAI API connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        body: JSON.stringify({ task: mockTaskInput }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toEqual({ 
        error: 'AI見積もりサービスに接続できません。しばらく時間をおいて再試行してください。' 
      });
      expect(mockEstimateTask).toHaveBeenCalledWith({ task: mockTaskInput });
    });

    it('should handle generic errors with error message', async () => {
      const errorMessage = 'タスクの複雑度計算でエラーが発生しました';
      mockEstimateTask.mockRejectedValue(new Error(errorMessage));

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        body: JSON.stringify({ task: mockTaskInput }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ 
        error: `見積もりの生成に失敗しました: ${errorMessage}` 
      });
      expect(mockEstimateTask).toHaveBeenCalledWith({ task: mockTaskInput });
    });

    it('should handle non-Error exceptions', async () => {
      mockEstimateTask.mockRejectedValue('Unexpected string error');

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        body: JSON.stringify({ task: mockTaskInput }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: '見積もりの生成に失敗しました' });
      expect(mockEstimateTask).toHaveBeenCalledWith({ task: mockTaskInput });
    });

    it('should handle invalid JSON request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: '見積もりの生成に失敗しました: Unexpected token \'i\', "invalid json" is not valid JSON' });
      expect(mockEstimateTask).not.toHaveBeenCalled();
    });

    it('should handle complex task objects correctly', async () => {
      const complexTask = {
        title: '複雑なタスク',
        description: '非常に詳細な説明を含むタスク',
        priority: 'must' as const,
        category: 'システム開発',
        estimated_hours: 8.5,
        status: 'pending' as const,
      };
      const complexEstimate = {
        ...mockEstimateResponse,
        estimated_hours: 8.5,
        confidence_score: 0.6,
        reasoning: '複雑なタスクのため、より多くの時間が必要と推定されます。',
      };
      
      mockEstimateTask.mockResolvedValue(complexEstimate);

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        body: JSON.stringify({ task: complexTask }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(complexEstimate);
      expect(mockEstimateTask).toHaveBeenCalledWith({ task: complexTask });
    });

    it('should handle minimal task objects correctly', async () => {
      const minimalTask = {
        title: '最小限のタスク',
        priority: 'want' as const,
      };
      
      mockEstimateTask.mockResolvedValue(mockEstimateResponse);

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        body: JSON.stringify({ task: minimalTask }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockEstimateResponse);
      expect(mockEstimateTask).toHaveBeenCalledWith({ task: minimalTask });
    });

    it('should handle estimate with questions array', async () => {
      const estimateWithQuestions = {
        ...mockEstimateResponse,
        questions: [
          'このタスクにはデータベース設計が含まれますか？',
          'UIのデザインは完了していますか？',
          'テスト実装も含めますか？'
        ],
      };
      
      mockEstimateTask.mockResolvedValue(estimateWithQuestions);

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        body: JSON.stringify({ task: mockTaskInput }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(estimateWithQuestions);
      expect(data.questions).toHaveLength(3);
      expect(mockEstimateTask).toHaveBeenCalledWith({ task: mockTaskInput });
    });

    it('should handle estimate without questions', async () => {
      const estimateWithoutQuestions = {
        estimated_hours: 1.5,
        confidence_score: 0.9,
        reasoning: 'シンプルなタスクで確実に見積もりできます。',
      };
      
      mockEstimateTask.mockResolvedValue(estimateWithoutQuestions);

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        body: JSON.stringify({ task: mockTaskInput }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(estimateWithoutQuestions);
      expect(data.questions).toBeUndefined();
      expect(mockEstimateTask).toHaveBeenCalledWith({ task: mockTaskInput });
    });
  });
});