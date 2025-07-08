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

    let estimate;
    
    // Try OpenAI API first, fallback to mock if unavailable
    try {
      estimate = await AIService.estimateTask(body);
    } catch (aiError) {
      console.warn('OpenAI API unavailable, using mock estimate:', aiError);
      estimate = generateMockEstimate(task);
    }

    return NextResponse.json(estimate);
  } catch (error) {
    console.error('見積もりエラー:', error);
    return NextResponse.json(
      { error: '見積もりの生成に失敗しました' },
      { status: 500 }
    );
  }
}

function generateMockEstimate(task: { title: string; description?: string; priority?: string }) {
  // Simple mock estimation logic
  const title = task.title.toLowerCase();
  const description = task.description?.toLowerCase() || '';
  const combined = `${title} ${description}`;

  let hours = 2; // Default 2 hours
  let confidence = 0.7;
  let reasoning = 'タスクの複雑さに基づいた推定';
  const questions: string[] = [];

  // Check for keywords that might indicate complexity
  if (combined.includes('プレゼンテーション') || combined.includes('発表')) {
    hours = 4;
    reasoning = 'プレゼンテーション準備は資料作成と練習が必要';
    questions.push('何人の聴衆を想定していますか？');
    questions.push('既存の資料やテンプレートはありますか？');
  } else if (combined.includes('資料') || combined.includes('ドキュメント')) {
    hours = 3;
    reasoning = '資料作成は調査と執筆時間が必要';
    questions.push('何ページ程度の資料ですか？');
    questions.push('参考資料はどの程度ありますか？');
  } else if (combined.includes('会議') || combined.includes('ミーティング')) {
    hours = 1;
    reasoning = '会議の準備と参加時間';
    questions.push('会議の長さはどのくらいですか？');
    questions.push('事前準備は必要ですか？');
  } else if (combined.includes('学習') || combined.includes('勉強')) {
    hours = 3;
    reasoning = '学習には理解と復習の時間が必要';
    questions.push('新しい分野の学習ですか？');
    questions.push('実践的な練習も含まれますか？');
  } else if (combined.includes('レポート') || combined.includes('報告書')) {
    hours = 5;
    reasoning = 'レポート作成は調査、分析、執筆が必要';
    questions.push('何文字程度のレポートですか？');
    questions.push('データ収集は必要ですか？');
  }

  // Adjust based on priority
  if (task.priority === 'must') {
    confidence += 0.1;
  }

  // Add uncertainty if description is missing
  if (!task.description) {
    confidence -= 0.2;
    questions.push('タスクの詳細を教えていただけますか？');
  }

  return {
    estimated_hours: Math.max(0.5, hours),
    hours: Math.max(0.5, hours), // 下位互換性のため
    confidence_score: Math.max(0.1, Math.min(1.0, confidence)),
    reasoning,
    questions,
  };
}