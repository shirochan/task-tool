import OpenAI from 'openai';
import { EstimateRequest, EstimateResponse } from '@/lib/types';

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }
  
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export class AIService {
  static async estimateTask(request: EstimateRequest): Promise<EstimateResponse> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const { task } = request;
    
    const prompt = `
タスクの見積もりをお願いします。以下のタスクについて、作業時間を推定してください。

タスク名: ${task.title}
詳細: ${task.description || 'なし'}
優先度: ${task.priority === 'must' ? '必須（今週中に完了）' : '希望（できれば今週中）'}
カテゴリ: ${task.category || 'なし'}

以下の形式でJSONで回答してください：
{
  "estimated_hours": 推定時間（数値、0.5時間単位）,
  "confidence_score": 信頼度（0.0〜1.0）,
  "reasoning": "推定理由の説明",
  "questions": ["より正確な見積もりのための質問1", "質問2"]
}

推定する際の考慮事項：
- 一般的な作業者のスキルレベルを想定
- 準備時間、実行時間、確認時間を含める
- 複雑さ、必要なスキル、外部依存性を考慮
- 不明な点があれば質問を含める
- 現実的で実行可能な時間を提示

JSON形式のみで回答してください。
`;

    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'あなたは経験豊富なプロジェクトマネージャーです。タスクの工数見積もりを正確に行います。常にJSON形式で回答してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('OpenAI API returned empty response');
      }

      try {
        const parsed = JSON.parse(response);
        return {
          estimated_hours: parsed.estimated_hours || 2,
          hours: parsed.estimated_hours || 2, // 下位互換性のため
          confidence_score: parsed.confidence_score || 0.5,
          reasoning: parsed.reasoning || 'AI推定',
          questions: parsed.questions || [],
        };
      } catch {
        console.error('Failed to parse OpenAI response:', response);
        throw new Error('Invalid response format from OpenAI');
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('AI見積もりの取得に失敗しました');
    }
  }

  static async generateScheduleRecommendations(tasks: Array<{
    id: number;
    title: string;
    description?: string;
    priority: 'must' | 'want';
    estimated_hours?: number;
  }>): Promise<{
    recommendations: string[];
    optimizations: string[];
  }> {
    if (!process.env.OPENAI_API_KEY) {
      return {
        recommendations: ['OpenAI APIキーが設定されていません'],
        optimizations: [],
      };
    }

    const tasksDescription = tasks.map(task => 
      `- ${task.title} (${task.priority === 'must' ? '必須' : '希望'}, ${task.estimated_hours || '未見積もり'}時間): ${task.description || ''}`
    ).join('\n');

    const prompt = `
以下のタスクリストに基づいて、週間スケジュールの推奨事項を提案してください：

${tasksDescription}

以下の形式でJSONで回答してください：
{
  "recommendations": [
    "スケジュール作成のための推奨事項1",
    "推奨事項2"
  ],
  "optimizations": [
    "効率化のための提案1",
    "提案2"
  ]
}

考慮すべき点：
- 優先度の高いタスクを先に配置
- 作業時間の合計が週40時間を超えないように調整
- 関連するタスクをグループ化
- エネルギーレベルに応じた時間配分
- バッファ時間の確保

JSON形式のみで回答してください。
`;

    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'あなたは効率的なスケジュール管理の専門家です。実践的で実行可能な提案を行います。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 400,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        return {
          recommendations: ['AI応答を取得できませんでした'],
          optimizations: [],
        };
      }

      try {
        const parsed = JSON.parse(response);
        return {
          recommendations: parsed.recommendations || ['推奨事項を生成できませんでした'],
          optimizations: parsed.optimizations || [],
        };
      } catch {
        console.error('Failed to parse OpenAI response:', response);
        return {
          recommendations: ['応答の解析に失敗しました'],
          optimizations: [],
        };
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      return {
        recommendations: ['AI推奨事項の取得に失敗しました'],
        optimizations: [],
      };
    }
  }
}