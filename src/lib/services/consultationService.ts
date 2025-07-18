import { statements } from '@/lib/database/db';
import { ChatMessage } from '@/lib/types';

export class ConsultationService {

  // チャット履歴を保存
  saveMessage(sessionId: string, message: ChatMessage): void {
    const metadata = message.metadata ? JSON.stringify(message.metadata) : null;
    
    statements.insertConsultationMessage.run(
      sessionId,
      message.type,
      message.content,
      message.metadata?.consultation_type || 'general',
      message.metadata?.confidence_score || null,
      metadata,
      message.timestamp.toISOString()
    );
  }

  // セッションの履歴を取得
  getSessionHistory(sessionId: string, limit: number = 50): ChatMessage[] {
    const rows = statements.getSessionHistory.all(sessionId, limit) as Array<{
      id: number;
      message_type: 'user' | 'ai';
      content: string;
      created_at: string;
      metadata: string | null;
    }>;
    
    return rows.map((row) => ({
      id: row.id.toString(),
      type: row.message_type,
      content: row.content,
      timestamp: new Date(row.created_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    })).reverse(); // 新しい順にして返す
  }

  // 最近のセッション一覧を取得
  getRecentSessions(limit: number = 10): Array<{
    sessionId: string;
    lastMessage: string;
    lastActivity: Date;
    messageCount: number;
  }> {
    const rows = statements.getRecentSessions.all(limit) as Array<{
      session_id: string;
      message_count: number;
      last_activity: string;
      last_message: string;
    }>;
    
    return rows.map((row) => ({
      sessionId: row.session_id,
      lastMessage: row.last_message,
      lastActivity: new Date(row.last_activity),
      messageCount: row.message_count
    }));
  }

  // セッションを削除
  deleteSession(sessionId: string): void {
    statements.deleteSession.run(sessionId);
  }

  // 古い履歴を削除（30日以上前）
  cleanupOldHistory(): number {
    const result = statements.cleanupOldHistory.run();
    return result.changes;
  }

  // セッションの統計情報を取得
  getSessionStats(sessionId: string): {
    messageCount: number;
    avgConfidenceScore: number;
    consultationTypes: Record<string, number>;
    duration: number; // 分単位
  } {
    const stats = statements.getSessionStats.get(sessionId) as {
      message_count: number;
      avg_confidence: number | null;
      first_message: string | null;
      last_message: string | null;
    };
    const types = statements.getConsultationTypes.all(sessionId) as Array<{
      consultation_type: string;
      count: number;
    }>;

    const consultationTypes = types.reduce((acc, row) => {
      acc[row.consultation_type] = row.count;
      return acc;
    }, {} as Record<string, number>);

    let duration = 0;
    if (stats.first_message && stats.last_message) {
      const start = new Date(stats.first_message);
      const end = new Date(stats.last_message);
      duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    }

    return {
      messageCount: stats.message_count || 0,
      avgConfidenceScore: stats.avg_confidence || 0,
      consultationTypes,
      duration
    };
  }
}