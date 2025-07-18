import { ConsultationService } from '@/lib/services/consultationService';
import { ChatMessage } from '@/lib/types';
import { statements } from '@/lib/database/db';

// Mock the database
jest.mock('@/lib/database/db', () => ({
  statements: {
    insertConsultationMessage: { run: jest.fn() },
    getSessionHistory: { all: jest.fn() },
    getRecentSessions: { all: jest.fn() },
    deleteSession: { run: jest.fn() },
    cleanupOldHistory: { run: jest.fn().mockReturnValue({ changes: 10 }) },
    getSessionStats: { get: jest.fn() },
    getConsultationTypes: { all: jest.fn() },
  },
}));

describe('ConsultationService', () => {
  let service: ConsultationService;

  beforeEach(() => {
    service = new ConsultationService();
    jest.clearAllMocks();
  });

  describe('saveMessage', () => {
    it('メッセージを正常に保存する', () => {
      const sessionId = 'test-session';
      const message: ChatMessage = {
        id: 'msg-1',
        type: 'user',
        content: 'テストメッセージ',
        timestamp: new Date('2023-01-01T10:00:00Z'),
        metadata: {
          consultation_type: 'general',
          confidence_score: 0.8,
        },
      };

      service.saveMessage(sessionId, message);

      expect(statements.insertConsultationMessage.run).toHaveBeenCalledWith(
        sessionId,
        'user',
        'テストメッセージ',
        'general',
        0.8,
        JSON.stringify(message.metadata),
        '2023-01-01T10:00:00.000Z'
      );
    });

    it('メタデータがない場合はnullで保存する', () => {
      const sessionId = 'test-session';
      const message: ChatMessage = {
        id: 'msg-1',
        type: 'ai',
        content: 'AI応答',
        timestamp: new Date('2023-01-01T10:00:00Z'),
      };

      service.saveMessage(sessionId, message);

      expect(statements.insertConsultationMessage.run).toHaveBeenCalledWith(
        sessionId,
        'ai',
        'AI応答',
        'general',
        null,
        null,
        '2023-01-01T10:00:00.000Z'
      );
    });
  });

  describe('getSessionHistory', () => {
    it('セッション履歴を正常に取得する', () => {
      const mockRows = [
        {
          id: 2,
          message_type: 'ai',
          content: 'AI応答',
          created_at: '2023-01-01T10:01:00Z',
          metadata: null,
        },
        {
          id: 1,
          message_type: 'user',
          content: 'ユーザーメッセージ',
          created_at: '2023-01-01T10:00:00Z',
          metadata: JSON.stringify({ consultation_type: 'general' }),
        },
      ];

      (statements.getSessionHistory.all as jest.Mock).mockReturnValue(mockRows);

      const result = service.getSessionHistory('test-session', 10);

      expect(statements.getSessionHistory.all).toHaveBeenCalledWith('test-session', 10);
      expect(result).toHaveLength(2);
      // 結果は日付順で返されるので、最初のメッセージが先頭に来る
      expect(result[0]).toEqual({
        id: '1',
        type: 'user',
        content: 'ユーザーメッセージ',
        timestamp: new Date('2023-01-01T10:00:00Z'),
        metadata: { consultation_type: 'general' },
      });
      expect(result[1]).toEqual({
        id: '2',
        type: 'ai',
        content: 'AI応答',
        timestamp: new Date('2023-01-01T10:01:00Z'),
        metadata: undefined,
      });
    });
  });

  describe('getRecentSessions', () => {
    it('最近のセッション一覧を取得する', () => {
      const mockRows = [
        {
          session_id: 'session-1',
          message_count: 5,
          last_activity: '2023-01-01T10:00:00Z',
          last_message: '最後のメッセージ',
        },
        {
          session_id: 'session-2',
          message_count: 3,
          last_activity: '2023-01-01T09:00:00Z',
          last_message: '別のメッセージ',
        },
      ];

      (statements.getRecentSessions.all as jest.Mock).mockReturnValue(mockRows);

      const result = service.getRecentSessions(5);

      expect(statements.getRecentSessions.all).toHaveBeenCalledWith(5);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        sessionId: 'session-1',
        lastMessage: '最後のメッセージ',
        lastActivity: new Date('2023-01-01T10:00:00Z'),
        messageCount: 5,
      });
    });
  });

  describe('deleteSession', () => {
    it('セッションを正常に削除する', () => {
      service.deleteSession('test-session');

      expect(statements.deleteSession.run).toHaveBeenCalledWith('test-session');
    });
  });

  describe('cleanupOldHistory', () => {
    it('古い履歴を正常に削除する', () => {
      const result = service.cleanupOldHistory();

      expect(statements.cleanupOldHistory.run).toHaveBeenCalled();
      expect(result).toBe(10);
    });
  });

  describe('getSessionStats', () => {
    it('セッションの統計情報を取得する', () => {
      const mockStats = {
        message_count: 10,
        avg_confidence: 0.75,
        first_message: '2023-01-01T10:00:00Z',
        last_message: '2023-01-01T11:00:00Z',
      };

      const mockTypes = [
        { consultation_type: 'general', count: 5 },
        { consultation_type: 'task_planning', count: 3 },
      ];

      (statements.getSessionStats.get as jest.Mock).mockReturnValue(mockStats);
      (statements.getConsultationTypes.all as jest.Mock).mockReturnValue(mockTypes);

      const result = service.getSessionStats('test-session');

      expect(statements.getSessionStats.get).toHaveBeenCalledWith('test-session');
      expect(statements.getConsultationTypes.all).toHaveBeenCalledWith('test-session');
      
      expect(result).toEqual({
        messageCount: 10,
        avgConfidenceScore: 0.75,
        consultationTypes: {
          general: 5,
          task_planning: 3,
        },
        duration: 60, // 1時間 = 60分
      });
    });

    it('統計情報がない場合はデフォルト値を返す', () => {
      const mockStats = {
        message_count: 0,
        avg_confidence: null,
        first_message: null,
        last_message: null,
      };

      const mockTypes: Array<{ consultation_type: string; count: number }> = [];

      (statements.getSessionStats.get as jest.Mock).mockReturnValue(mockStats);
      (statements.getConsultationTypes.all as jest.Mock).mockReturnValue(mockTypes);

      const result = service.getSessionStats('test-session');

      expect(result).toEqual({
        messageCount: 0,
        avgConfidenceScore: 0,
        consultationTypes: {},
        duration: 0,
      });
    });
  });
});