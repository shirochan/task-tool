import { AIService } from '@/lib/services/aiService';
import { EstimateRequest, EstimateResponse } from '@/lib/types';
import { mockTaskInput, mockEstimateResponse } from '@/test-utils/fixtures';

// OpenAI APIをモック
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

describe('AIService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 環境変数をリセット
    process.env = { ...originalEnv };
    
    // OpenAIモックをリセット
    mockCreate.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('estimateTask', () => {
    const estimateRequest: EstimateRequest = {
      task: mockTaskInput,
      context: 'テスト用コンテキスト',
    };

    it('should return estimate response when OpenAI API is successful', async () => {
      // OpenAI API keyを設定
      process.env.OPENAI_API_KEY = 'test-api-key';

      // OpenAI APIの成功レスポンスをモック
      const mockResponse = JSON.stringify(mockEstimateResponse);
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: mockResponse,
            },
          },
        ],
      });

      const result = await AIService.estimateTask(estimateRequest);

      expect(result).toEqual({
        estimated_hours: mockEstimateResponse.estimated_hours,
        hours: mockEstimateResponse.estimated_hours, // 下位互換性
        confidence_score: mockEstimateResponse.confidence_score,
        reasoning: mockEstimateResponse.reasoning,
        questions: mockEstimateResponse.questions || [],
      });

      // OpenAI APIが適切なパラメータで呼び出されたことを確認
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(mockTaskInput.title),
            }),
          ]),
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: "json_object" },
        })
      );
    });

    it('should throw error when OpenAI API key is not configured', async () => {
      // API keyを削除
      delete process.env.OPENAI_API_KEY;

      await expect(AIService.estimateTask(estimateRequest))
        .rejects
        .toThrow('OpenAI API key is not configured');
    });

    it('should throw error when OpenAI API returns empty response', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      // 空のレスポンスをモック
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      await expect(AIService.estimateTask(estimateRequest))
        .rejects
        .toThrow('OpenAI APIから空のレスポンスが返されました');
    });

    it('should throw error when OpenAI API returns invalid JSON', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      // 無効なJSONをモック
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'invalid json response',
            },
          },
        ],
      });

      await expect(AIService.estimateTask(estimateRequest))
        .rejects
        .toThrow('OpenAI APIからの応答をJSON形式で解析できませんでした');
    });

    it('should throw error when response validation fails', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      // 不正な形式のレスポンスをモック
      const invalidResponse = JSON.stringify({
        estimated_hours: 'invalid', // 数値ではない
        confidence_score: 0.8,
        reasoning: 'テスト理由',
      });

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: invalidResponse,
            },
          },
        ],
      });

      await expect(AIService.estimateTask(estimateRequest))
        .rejects
        .toThrow('OpenAI APIレスポンスの形式が不正です');
    });

    it('should throw error when OpenAI API call fails', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      // API呼び出しエラーをモック
      mockCreate.mockRejectedValueOnce(
        new Error('API request failed')
      );

      await expect(AIService.estimateTask(estimateRequest))
        .rejects
        .toThrow('API request failed');
    });

    it('should handle missing optional fields in response', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      // questionsフィールドなしのレスポンス
      const responseWithoutQuestions = JSON.stringify({
        estimated_hours: 2.5,
        confidence_score: 0.8,
        reasoning: 'テスト理由',
        // questions フィールドなし
      });

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: responseWithoutQuestions,
            },
          },
        ],
      });

      const result = await AIService.estimateTask(estimateRequest);

      expect(result.questions).toEqual([]);
    });
  });

  describe('generateScheduleRecommendations', () => {
    const mockTasks = [
      {
        id: 1,
        title: 'タスク1',
        description: 'テストタスク1',
        priority: 'must' as const,
        estimated_hours: 2,
      },
      {
        id: 2,
        title: 'タスク2',
        priority: 'want' as const,
        estimated_hours: 1,
      },
    ];

    it('should return recommendations when OpenAI API is successful', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      const mockResponse = JSON.stringify({
        recommendations: ['推奨事項1', '推奨事項2'],
        optimizations: ['最適化案1'],
      });

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: mockResponse,
            },
          },
        ],
      });

      const result = await AIService.generateScheduleRecommendations(mockTasks);

      expect(result).toEqual({
        recommendations: ['推奨事項1', '推奨事項2'],
        optimizations: ['最適化案1'],
      });
    });

    it('should return fallback message when API key is not configured', async () => {
      delete process.env.OPENAI_API_KEY;

      const result = await AIService.generateScheduleRecommendations(mockTasks);

      expect(result).toEqual({
        recommendations: ['OpenAI APIキーが設定されていません'],
        optimizations: [],
      });
    });

    it('should return fallback when OpenAI API returns empty response', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      const result = await AIService.generateScheduleRecommendations(mockTasks);

      expect(result).toEqual({
        recommendations: ['AI応答を取得できませんでした'],
        optimizations: [],
      });
    });

    it('should return fallback when JSON parsing fails', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'invalid json',
            },
          },
        ],
      });

      const result = await AIService.generateScheduleRecommendations(mockTasks);

      expect(result).toEqual({
        recommendations: ['応答の解析に失敗しました'],
        optimizations: [],
      });
    });

    it('should return fallback when OpenAI API call fails', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      mockCreate.mockRejectedValueOnce(
        new Error('API request failed')
      );

      const result = await AIService.generateScheduleRecommendations(mockTasks);

      expect(result).toEqual({
        recommendations: ['AI推奨事項の取得に失敗しました'],
        optimizations: [],
      });
    });

    it('should handle partial response data', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      // recommendationsのみでoptimizationsがないレスポンス
      const partialResponse = JSON.stringify({
        recommendations: ['推奨事項のみ'],
        // optimizations フィールドなし
      });

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: partialResponse,
            },
          },
        ],
      });

      const result = await AIService.generateScheduleRecommendations(mockTasks);

      expect(result).toEqual({
        recommendations: ['推奨事項のみ'],
        optimizations: [],
      });
    });
  });
});