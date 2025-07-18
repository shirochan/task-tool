import { NextRequest, NextResponse } from 'next/server';
import { ConsultationRequest, ChatMessage } from '@/lib/types';
import { AIService } from '@/lib/services/aiService';
import { ConsultationService } from '@/lib/services/consultationService';

export async function POST(request: NextRequest) {
  try {
    const body: ConsultationRequest & { sessionId?: string } = await request.json();
    const { message, sessionId = `session_${Date.now()}` } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: '相談内容を入力してください' },
        { status: 400 }
      );
    }

    const consultationService = new ConsultationService();

    // ユーザーメッセージを保存
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date(),
      metadata: {
        consultation_type: body.consultation_type
      }
    };

    consultationService.saveMessage(sessionId, userMessage);

    // 必要に応じて履歴を取得してコンテキストに含める
    const history = consultationService.getSessionHistory(sessionId, 10);
    const requestWithHistory = {
      ...body,
      context: {
        ...body.context,
        conversation_history: history
      }
    };

    // AI相談の実行
    const consultation = await AIService.consultWithAI(requestWithHistory);

    // AI応答を保存
    const aiMessage: ChatMessage = {
      id: `ai_${Date.now()}`,
      type: 'ai',
      content: consultation.message,
      timestamp: new Date(),
      metadata: {
        consultation_type: consultation.consultation_type,
        confidence_score: consultation.confidence_score
      }
    };

    consultationService.saveMessage(sessionId, aiMessage);

    // レスポンスにセッションIDを含める
    return NextResponse.json({
      ...consultation,
      sessionId
    });
  } catch (error) {
    console.error('相談エラー:', error);
    return NextResponse.json(
      { error: 'AI相談の処理に失敗しました' },
      { status: 500 }
    );
  }
}

// チャット履歴の取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが必要です' },
        { status: 400 }
      );
    }

    const consultationService = new ConsultationService();
    const history = consultationService.getSessionHistory(sessionId, limit);

    return NextResponse.json({ history });
  } catch (error) {
    console.error('履歴取得エラー:', error);
    return NextResponse.json(
      { error: '履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}