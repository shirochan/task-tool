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

// レスポンス検証ユーティリティ
function validateEstimateResponse(parsed: unknown): { isValid: boolean; error?: string } {
  // 型ガード: parsed が object であることを確認
  if (typeof parsed !== 'object' || parsed === null) {
    return { isValid: false, error: 'レスポンスはオブジェクトである必要があります' };
  }

  const obj = parsed as Record<string, unknown>;

  // 必須フィールドの存在確認
  if (!('estimated_hours' in obj)) {
    return { isValid: false, error: '必須フィールド "estimated_hours" が見つかりません' };
  }
  if (!('confidence_score' in obj)) {
    return { isValid: false, error: '必須フィールド "confidence_score" が見つかりません' };
  }
  if (!('reasoning' in obj)) {
    return { isValid: false, error: '必須フィールド "reasoning" が見つかりません' };
  }

  // 型検証
  if (typeof obj.estimated_hours !== 'number' || isNaN(obj.estimated_hours)) {
    return { isValid: false, error: '"estimated_hours" は数値である必要があります' };
  }
  if (typeof obj.confidence_score !== 'number' || isNaN(obj.confidence_score)) {
    return { isValid: false, error: '"confidence_score" は数値である必要があります' };
  }
  if (typeof obj.reasoning !== 'string') {
    return { isValid: false, error: '"reasoning" は文字列である必要があります' };
  }

  // 数値範囲の検証
  if (obj.estimated_hours <= 0) {
    return { isValid: false, error: '"estimated_hours" は正の数である必要があります' };
  }
  if (obj.confidence_score < 0 || obj.confidence_score > 1) {
    return { isValid: false, error: '"confidence_score" は0から1の間である必要があります' };
  }

  // questionsの検証（任意フィールド）
  if ('questions' in obj && obj.questions && !Array.isArray(obj.questions)) {
    return { isValid: false, error: '"questions" は配列である必要があります' };
  }

  return { isValid: true };
}

export class AIService {
  static async estimateTask(request: EstimateRequest): Promise<EstimateResponse> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const { task } = request;
    
    const prompt = `以下のタスクについて、作業時間を推定してください。

タスク名: ${task.title}
詳細: ${task.description || 'なし'}
優先度: ${task.priority === 'must' ? '必須（今週中に完了）' : '希望（できれば今週中）'}
カテゴリ: ${task.category || 'なし'}

必ず以下の正確なJSON形式で回答してください：
{
  "estimated_hours": 2.5,
  "confidence_score": 0.8,
  "reasoning": "推定理由の詳細説明",
  "questions": ["質問1", "質問2"]
}

重要な指示：
- estimated_hours: 0.5時間単位の正の数値（例: 1.0, 2.5, 4.0）
- confidence_score: 0.0から1.0の間の数値（例: 0.7）
- reasoning: 推定理由の文字列（必須）
- questions: 質問の配列（空配列でも可）

推定する際の考慮事項：
- 一般的な作業者のスキルレベルを想定
- 準備時間、実行時間、確認時間を含める
- 複雑さ、必要なスキル、外部依存性を考慮
- 不明な点があれば質問を含める
- 現実的で実行可能な時間を提示

JSON以外の説明文は一切含めず、上記の形式のJSONのみで回答してください。`;

    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'あなたは経験豊富なプロジェクトマネージャーです。タスクの工数見積もりを正確に行います。指定されたJSON形式で必ず回答してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('OpenAI APIから空のレスポンスが返されました');
      }

      let parsed;
      try {
        parsed = JSON.parse(response);
      } catch (jsonError) {
        console.error('JSON解析エラー:', jsonError);
        console.error('OpenAIレスポンス:', response);
        throw new Error('OpenAI APIからの応答をJSON形式で解析できませんでした');
      }

      // レスポンス検証
      const validation = validateEstimateResponse(parsed);
      if (!validation.isValid) {
        console.error('レスポンス検証エラー:', validation.error);
        console.error('OpenAIレスポンス:', response);
        throw new Error(`OpenAI APIレスポンスの形式が不正です: ${validation.error}`);
      }

      const obj = parsed as Record<string, unknown>;
      return {
        estimated_hours: obj.estimated_hours as number,
        hours: obj.estimated_hours as number, // 下位互換性のため
        confidence_score: obj.confidence_score as number,
        reasoning: obj.reasoning as string,
        questions: (obj.questions as string[]) || [],
      };
    } catch (error) {
      console.error('OpenAI API エラー:', error);
      // エラーをログに記録し、再スローする
      throw error;
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
        model: 'gpt-4o',
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