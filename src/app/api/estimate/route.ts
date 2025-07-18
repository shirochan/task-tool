import { NextRequest, NextResponse } from 'next/server';
import { EstimateRequest } from '@/lib/types';
import { AIService } from '@/lib/services/aiService';

export async function POST(request: NextRequest) {
  try {
    const body: EstimateRequest = await request.json();
    const { task } = body;

    if (!task.title) {
      return NextResponse.json(
        { error: 'タスクのタイトルが必要です' },
        { status: 400 }
      );
    }

    const estimate = await AIService.estimateTask(body);
    return NextResponse.json(estimate);
  } catch (error) {
    console.error('見積もりエラー:', error);
    
    // エラーの種類に応じてレスポンスを分岐
    if (error instanceof Error) {
      if (error.message.includes('OpenAI API key is not configured')) {
        return NextResponse.json(
          { error: 'OpenAI APIキーが設定されていません。設定を確認してください。' },
          { status: 503 }
        );
      } else if (error.message.includes('OpenAI API')) {
        return NextResponse.json(
          { error: 'AI見積もりサービスに接続できません。しばらく時間をおいて再試行してください。' },
          { status: 503 }
        );
      } else {
        return NextResponse.json(
          { error: `見積もりの生成に失敗しました: ${error.message}` },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: '見積もりの生成に失敗しました' },
      { status: 500 }
    );
  }
}

