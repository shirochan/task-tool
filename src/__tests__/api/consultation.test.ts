/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/consultation/route';
import { ConsultationRequest } from '@/lib/types';

// Mock the AI service
jest.mock('@/lib/services/aiService', () => ({
  AIService: {
    consultWithAI: jest.fn(),
  },
}));

// Mock the consultation service
jest.mock('@/lib/services/consultationService', () => ({
  ConsultationService: jest.fn().mockImplementation(() => ({
    saveMessage: jest.fn(),
    getSessionHistory: jest.fn().mockReturnValue([]),
  })),
}));

describe('/api/consultation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('相談リクエストが成功する', async () => {
      const mockConsultation = {
        message: 'ご相談ありがとうございます。',
        suggestions: ['提案1', '提案2'],
        follow_up_questions: ['質問1', '質問2'],
        confidence_score: 0.8,
        consultation_type: 'general',
        metadata: {}
      };

      const { AIService } = await import('@/lib/services/aiService');
      AIService.consultWithAI.mockResolvedValue(mockConsultation);

      const requestData: ConsultationRequest = {
        message: 'タスクの優先順位について相談したいです',
        consultation_type: 'task_planning'
      };

      const request = new NextRequest('http://localhost:3000/api/consultation', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('ご相談ありがとうございます。');
      expect(data.suggestions).toEqual(['提案1', '提案2']);
      expect(data.follow_up_questions).toEqual(['質問1', '質問2']);
      expect(data.sessionId).toBeTruthy();
    });

    it('空のメッセージでエラーが返される', async () => {
      const requestData = {
        message: '',
        consultation_type: 'general'
      };

      const request = new NextRequest('http://localhost:3000/api/consultation', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('相談内容を入力してください');
    });

    it('不正なJSONでエラーが返される', async () => {
      const request = new NextRequest('http://localhost:3000/api/consultation', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('AI相談の処理に失敗しました');
    });

    it('AI相談でエラーが発生した場合の処理', async () => {
      const { AIService } = await import('@/lib/services/aiService');
      AIService.consultWithAI.mockRejectedValue(new Error('AI service error'));

      const requestData: ConsultationRequest = {
        message: 'テストメッセージ',
        consultation_type: 'general'
      };

      const request = new NextRequest('http://localhost:3000/api/consultation', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('AI相談の処理に失敗しました');
    });
  });

  describe('GET', () => {
    it('チャット履歴が正常に取得される', async () => {
      const mockHistory = [
        {
          id: '1',
          type: 'user',
          content: 'テストメッセージ',
          timestamp: new Date(),
        },
        {
          id: '2',
          type: 'ai',
          content: 'AI応答',
          timestamp: new Date(),
        }
      ];

      const { ConsultationService } = await import('@/lib/services/consultationService');
      const mockInstance = {
        getSessionHistory: jest.fn().mockReturnValue(mockHistory),
      };
      ConsultationService.mockImplementation(() => mockInstance);

      const request = new NextRequest('http://localhost:3000/api/consultation?sessionId=test-session&limit=10');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toHaveLength(2);
      expect(data.history[0]).toMatchObject({
        id: '1',
        type: 'user',
        content: 'テストメッセージ',
      });
      expect(data.history[1]).toMatchObject({
        id: '2',
        type: 'ai',
        content: 'AI応答',
      });
      expect(mockInstance.getSessionHistory).toHaveBeenCalledWith('test-session', 10);
    });

    it('sessionIdがない場合エラーが返される', async () => {
      const request = new NextRequest('http://localhost:3000/api/consultation');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('セッションIDが必要です');
    });

    it('履歴取得でエラーが発生した場合の処理', async () => {
      const { ConsultationService } = await import('@/lib/services/consultationService');
      const mockInstance = {
        getSessionHistory: jest.fn().mockImplementation(() => {
          throw new Error('Database error');
        }),
      };
      ConsultationService.mockImplementation(() => mockInstance);

      const request = new NextRequest('http://localhost:3000/api/consultation?sessionId=test-session');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('履歴の取得に失敗しました');
    });
  });
});