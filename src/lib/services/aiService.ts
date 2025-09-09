import OpenAI from 'openai';
import { EstimateRequest, EstimateResponse, type ChatMessage } from '@/lib/types';
import { createTaskEstimationPrompt, createScheduleRecommendationPrompt, SYSTEM_PROMPTS } from './ai-prompts';
import { aiLogger, formatError, sanitizeObject } from '@/lib/logger';

// GPT-5-miniのトークン制限定数
const GPT5_MINI_TOKENS = {
  CONSULTATION: 8000,  // 会話形式の相談用（推論トークン多消費）
  ESTIMATION: 6000,    // タスク見積もり用
  SCHEDULE: 2000,      // スケジュール推奨用
} as const;

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
  // チャット履歴を考慮した会話形式の相談
  static async consultWithHistory(request: EstimateRequest): Promise<EstimateResponse> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const { task, chatHistory = [] } = request;
    
    try {
      const openai = getOpenAIClient();
      
      // メッセージ配列を構築
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: `あなたはタスク管理の専門家です。ユーザーとの会話履歴を考慮して、タスクの見積もりや詳細について相談に乗ってください。

基本タスク情報:
- タイトル: ${task.title}
- 説明: ${task.description || 'なし'}
- 優先度: ${task.priority === 'must' ? '必須' : '希望'}
- カテゴリ: ${task.category || 'なし'}
- 現在の見積もり: ${task.estimated_hours || 'なし'}

会話の最後には、現在の情報に基づいて以下のJSON形式で応答してください：
{
  "estimated_hours": 見積もり時間(数値),
  "confidence_score": 信頼度0-1(数値),
  "reasoning": "見積もりの根拠や相談内容の要約",
  "questions": ["追加で確認したい点があれば配列で"]
}`
        }
      ];

      // チャット履歴を追加
      for (const message of chatHistory as ChatMessage[]) {
        messages.push({
          role: message.type === 'user' ? 'user' : 'assistant',
          content: message.content
        });
      }
      

      const completion = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages,
        max_completion_tokens: GPT5_MINI_TOKENS.CONSULTATION,
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
      const result = {
        estimated_hours: obj.estimated_hours as number,
        hours: obj.estimated_hours as number, // 下位互換性のため
        confidence_score: obj.confidence_score as number,
        reasoning: obj.reasoning as string,
        questions: (obj.questions as string[]) || [],
      };
      
      
      return result;
    } catch (error) {
      aiLogger.error({
        error: formatError(error),
        operation: 'consultWithHistory',
        taskTitle: (sanitizeObject(request.task) as Record<string, unknown>)?.title
      }, 'OpenAI API エラー: 会話履歴付き相談処理に失敗');
      throw error;
    }
  }

  static async estimateTask(request: EstimateRequest): Promise<EstimateResponse> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const { task } = request;
    
    const prompt = createTaskEstimationPrompt(task);

    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.TASK_ESTIMATION
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: GPT5_MINI_TOKENS.ESTIMATION,
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
      aiLogger.error({
        error: formatError(error),
        operation: 'estimateTask',
        taskTitle: (sanitizeObject(request.task) as Record<string, unknown>)?.title
      }, 'OpenAI API エラー: タスク見積もり処理に失敗');
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

    const prompt = createScheduleRecommendationPrompt(tasks);

    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.SCHEDULE_OPTIMIZATION
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: GPT5_MINI_TOKENS.SCHEDULE,
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
      } catch (parseError) {
        aiLogger.warn({
          error: formatError(parseError),
          responseLength: response?.length || 0,
          operation: 'generateScheduleRecommendations'
        }, 'スケジュール推奨事項レスポンスの解析に失敗');
        return {
          recommendations: ['応答の解析に失敗しました'],
          optimizations: [],
        };
      }
    } catch (error) {
      aiLogger.error({
        error: formatError(error),
        operation: 'generateScheduleRecommendations',
        taskCount: tasks?.length || 0
      }, 'OpenAI API エラー: スケジュール推奨事項生成に失敗');
      return {
        recommendations: ['AI推奨事項の取得に失敗しました'],
        optimizations: [],
      };
    }
  }
}
