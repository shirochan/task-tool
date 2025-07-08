/**
 * @jest-environment node
 */

import { AIService } from '@/lib/services/aiService'
import { EstimateRequest } from '@/lib/types'
import OpenAI from 'openai'

// OpenAIのモック
const mockCreate = jest.fn()
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
  }
})

describe('AIService', () => {
  let originalEnv: typeof process.env

  beforeEach(() => {
    originalEnv = process.env
    jest.clearAllMocks()
    mockCreate.mockClear()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('estimateTask', () => {
    const mockRequest: EstimateRequest = {
      task: {
        title: 'プレゼンテーション資料作成',
        description: '来週の会議用プレゼンテーション資料を作成する',
        priority: 'must',
        category: '仕事',
      },
    }

    it('OpenAI APIキーが設定されていない場合にエラーを投げる', async () => {
      delete process.env.OPENAI_API_KEY

      await expect(AIService.estimateTask(mockRequest)).rejects.toThrow('OpenAI API key is not configured')
    })

    it('正常にタスクの見積もりを取得できる', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                estimated_hours: 4,
                confidence_score: 0.8,
                reasoning: 'プレゼンテーション資料作成は調査、構成、デザイン、レビューの工程が必要',
                questions: ['どのような形式の資料ですか？', '参考資料はありますか？'],
              }),
            },
          },
        ],
      }

      mockCreate.mockResolvedValue(mockResponse as OpenAI.Chat.Completions.ChatCompletion)

      const result = await AIService.estimateTask(mockRequest)

      expect(result).toEqual({
        estimated_hours: 4,
        hours: 4,
        confidence_score: 0.8,
        reasoning: 'プレゼンテーション資料作成は調査、構成、デザイン、レビューの工程が必要',
        questions: ['どのような形式の資料ですか？', '参考資料はありますか？'],
      })
    })

    it('OpenAI APIから空の応答が返された場合にエラーを投げる', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      }

      mockCreate.mockResolvedValue(mockResponse as OpenAI.Chat.Completions.ChatCompletion)

      await expect(AIService.estimateTask(mockRequest)).rejects.toThrow('AI見積もりの取得に失敗しました')
    })

    it('不正なJSON応答の場合にエラーを投げる', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      const mockResponse = {
        choices: [
          {
            message: {
              content: '不正なJSON',
            },
          },
        ],
      }

      mockCreate.mockResolvedValue(mockResponse as OpenAI.Chat.Completions.ChatCompletion)

      await expect(AIService.estimateTask(mockRequest)).rejects.toThrow('AI見積もりの取得に失敗しました')
    })

    it('部分的に不正なJSON応答の場合にデフォルト値を使用する', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                estimated_hours: 3,
                // confidence_score, reasoning, questions が不足
              }),
            },
          },
        ],
      }

      mockCreate.mockResolvedValue(mockResponse as OpenAI.Chat.Completions.ChatCompletion)

      const result = await AIService.estimateTask(mockRequest)

      expect(result).toEqual({
        estimated_hours: 3,
        hours: 3,
        confidence_score: 0.5,
        reasoning: 'AI推定',
        questions: [],
      })
    })

    it('OpenAI APIの呼び出しでエラーが発生した場合にエラーを投げる', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      mockCreate.mockRejectedValue(new Error('API Error'))

      await expect(AIService.estimateTask(mockRequest)).rejects.toThrow('AI見積もりの取得に失敗しました')
    })

    it('正しいプロンプトでOpenAI APIを呼び出す', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                estimated_hours: 2,
                confidence_score: 0.7,
                reasoning: 'テスト用の見積もり',
                questions: [],
              }),
            },
          },
        ],
      }

      mockCreate.mockResolvedValue(mockResponse as OpenAI.Chat.Completions.ChatCompletion)

      await AIService.estimateTask(mockRequest)

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'あなたは経験豊富なプロジェクトマネージャーです。タスクの工数見積もりを正確に行います。常にJSON形式で回答してください。',
          },
          {
            role: 'user',
            content: expect.stringContaining('プレゼンテーション資料作成'),
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      })
    })
  })

  describe('generateScheduleRecommendations', () => {
    const mockTasks = [
      {
        id: 1,
        title: 'プレゼンテーション資料作成',
        description: '来週の会議用プレゼンテーション資料を作成する',
        priority: 'must' as const,
        estimated_hours: 4,
      },
      {
        id: 2,
        title: 'Next.js学習',
        description: 'Next.js 15の新機能について学習する',
        priority: 'want' as const,
        estimated_hours: 3,
      },
    ]

    it('OpenAI APIキーが設定されていない場合にデフォルトメッセージを返す', async () => {
      delete process.env.OPENAI_API_KEY

      const result = await AIService.generateScheduleRecommendations(mockTasks)

      expect(result).toEqual({
        recommendations: ['OpenAI APIキーが設定されていません'],
        optimizations: [],
      })
    })

    it('正常にスケジュール推奨事項を取得できる', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: [
                  '必須タスクを週の前半に配置してください',
                  '関連するタスクをまとめて処理してください',
                ],
                optimizations: [
                  'エネルギーレベルの高い午前中に重要なタスクを配置',
                  'バッファ時間を各タスクの後に確保',
                ],
              }),
            },
          },
        ],
      }

      mockCreate.mockResolvedValue(mockResponse as OpenAI.Chat.Completions.ChatCompletion)

      const result = await AIService.generateScheduleRecommendations(mockTasks)

      expect(result).toEqual({
        recommendations: [
          '必須タスクを週の前半に配置してください',
          '関連するタスクをまとめて処理してください',
        ],
        optimizations: [
          'エネルギーレベルの高い午前中に重要なタスクを配置',
          'バッファ時間を各タスクの後に確保',
        ],
      })
    })

    it('OpenAI APIから空の応答が返された場合にデフォルトメッセージを返す', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      }

      mockCreate.mockResolvedValue(mockResponse as OpenAI.Chat.Completions.ChatCompletion)

      const result = await AIService.generateScheduleRecommendations(mockTasks)

      expect(result).toEqual({
        recommendations: ['AI応答を取得できませんでした'],
        optimizations: [],
      })
    })

    it('不正なJSON応答の場合にエラーメッセージを返す', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      const mockResponse = {
        choices: [
          {
            message: {
              content: '不正なJSON',
            },
          },
        ],
      }

      mockCreate.mockResolvedValue(mockResponse as OpenAI.Chat.Completions.ChatCompletion)

      const result = await AIService.generateScheduleRecommendations(mockTasks)

      expect(result).toEqual({
        recommendations: ['応答の解析に失敗しました'],
        optimizations: [],
      })
    })

    it('部分的に不正なJSON応答の場合にデフォルト値を使用する', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: ['推奨事項1'],
                // optimizations が不足
              }),
            },
          },
        ],
      }

      mockCreate.mockResolvedValue(mockResponse as OpenAI.Chat.Completions.ChatCompletion)

      const result = await AIService.generateScheduleRecommendations(mockTasks)

      expect(result).toEqual({
        recommendations: ['推奨事項1'],
        optimizations: [],
      })
    })

    it('OpenAI APIの呼び出しでエラーが発生した場合にエラーメッセージを返す', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      mockCreate.mockRejectedValue(new Error('API Error'))

      const result = await AIService.generateScheduleRecommendations(mockTasks)

      expect(result).toEqual({
        recommendations: ['AI推奨事項の取得に失敗しました'],
        optimizations: [],
      })
    })

    it('正しいプロンプトでOpenAI APIを呼び出す', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: ['推奨事項'],
                optimizations: ['最適化'],
              }),
            },
          },
        ],
      }

      mockCreate.mockResolvedValue(mockResponse as OpenAI.Chat.Completions.ChatCompletion)

      await AIService.generateScheduleRecommendations(mockTasks)

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'あなたは効率的なスケジュール管理の専門家です。実践的で実行可能な提案を行います。',
          },
          {
            role: 'user',
            content: expect.stringContaining('プレゼンテーション資料作成'),
          },
        ],
        temperature: 0.4,
        max_tokens: 400,
      })
    })

    it('未見積もりタスクも含めて処理できる', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      const tasksWithoutEstimate = [
        {
          id: 1,
          title: 'タスク1',
          priority: 'must' as const,
          // estimated_hours が不足
        },
        {
          id: 2,
          title: 'タスク2',
          description: 'タスク2の説明',
          priority: 'want' as const,
          estimated_hours: 2,
        },
      ]

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: ['推奨事項'],
                optimizations: ['最適化'],
              }),
            },
          },
        ],
      }

      mockCreate.mockResolvedValue(mockResponse as OpenAI.Chat.Completions.ChatCompletion)

      const result = await AIService.generateScheduleRecommendations(tasksWithoutEstimate)

      expect(result).toEqual({
        recommendations: ['推奨事項'],
        optimizations: ['最適化'],
      })

      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.messages[1].content).toContain('未見積もり')
    })
  })
})