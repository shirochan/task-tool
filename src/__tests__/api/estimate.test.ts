/**
 * @jest-environment node
 */

import { POST } from '@/app/api/estimate/route'
import { NextRequest } from 'next/server'

// AIServiceのモック
jest.mock('@/lib/services/aiService', () => ({
  AIService: {
    estimateTask: jest.fn(),
  },
}))

describe('/api/estimate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 環境変数をクリア
    delete process.env.OPENAI_API_KEY
  })

  describe('POST /api/estimate', () => {
    it('OpenAI APIが利用可能な場合にAI見積もりを返す', async () => {
      // OpenAI APIキーを設定
      process.env.OPENAI_API_KEY = 'test-api-key'
      
      const { AIService } = await import('@/lib/services/aiService')
      const mockEstimateTask = AIService.estimateTask as jest.Mock

      const mockResponse = {
        estimated_hours: 3,
        confidence_score: 0.85,
        reasoning: 'プレゼンテーション資料作成は調査と資料作成が必要',
        questions: ['どのような形式の資料ですか？', '参考資料はありますか？'],
      }

      mockEstimateTask.mockResolvedValue(mockResponse)

      const taskInput = {
        task: {
          title: 'プレゼンテーション資料作成',
          description: '来週の会議用の資料を作成する',
          priority: 'must' as const,
          category: '仕事',
        },
      }

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskInput),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.estimated_hours).toBe(3)
      expect(data.confidence_score).toBe(0.85)
      expect(data.reasoning).toContain('プレゼンテーション')
      expect(Array.isArray(data.questions)).toBe(true)
      expect(mockEstimateTask).toHaveBeenCalledWith(taskInput)
    })

    it('OpenAI APIが利用不可の場合にエラーを返す', async () => {
      // OpenAI APIキーを設定しない
      delete process.env.OPENAI_API_KEY

      const { AIService } = await import('@/lib/services/aiService')
      const mockEstimateTask = AIService.estimateTask as jest.Mock
      mockEstimateTask.mockRejectedValue(new Error('OpenAI API key is not configured'))

      const taskInput = {
        task: {
          title: 'プレゼンテーション資料作成',
          description: '来週の会議用の資料を作成する',
          priority: 'must' as const,
          category: '仕事',
        },
      }

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskInput),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('OpenAI APIキーが設定されていません')
    })

    it('OpenAI APIエラーの場合にエラーを返す', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      const { AIService } = await import('@/lib/services/aiService')
      const mockEstimateTask = AIService.estimateTask as jest.Mock
      mockEstimateTask.mockRejectedValue(new Error('OpenAI API レスポンスの形式が不正です'))

      const taskInput = {
        task: {
          title: 'プレゼンテーション準備',
          description: 'プレゼンテーション用の資料を作成',
          priority: 'must' as const,
        },
      }

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskInput),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('AI見積もりサービスに接続できません')
    })

    it('一般的なエラーの場合にエラーメッセージを返す', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      const { AIService } = await import('@/lib/services/aiService')
      const mockEstimateTask = AIService.estimateTask as jest.Mock
      mockEstimateTask.mockRejectedValue(new Error('一般的なエラーメッセージ'))

      const taskInput = {
        task: {
          title: '会議参加',
          description: 'チームミーティングに参加する',
          priority: 'must' as const,
        },
      }

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskInput),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('一般的なエラーメッセージ')
    })

    it('必須フィールドが不足している場合にエラーを返す', async () => {
      const invalidInput = {
        // taskフィールドが不足
      }

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidInput),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500) // 現在の実装では500エラー
      expect(data).toHaveProperty('error')
    })

    it('タスクのタイトルが不足している場合にエラーを返す', async () => {
      const invalidInput = {
        task: {
          description: 'タイトルがありません',
          priority: 'must' as const,
        },
      }

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidInput),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('タイトル')
    })

    it('OpenAI APIが成功した場合に正常なレスポンスを返す', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key'

      const { AIService } = await import('@/lib/services/aiService')
      const mockEstimateTask = AIService.estimateTask as jest.Mock
      
      const mockResponse = {
        estimated_hours: 2.5,
        confidence_score: 0.8,
        reasoning: 'テストタスクの見積もり',
        questions: ['詳細を教えてください'],
      }
      
      mockEstimateTask.mockResolvedValue(mockResponse)

      const taskInput = {
        task: {
          title: 'テストタスク',
          description: '詳細な説明があります',
          priority: 'must' as const,
        },
      }

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskInput),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.estimated_hours).toBe(2.5)
      expect(data.confidence_score).toBe(0.8)
      expect(data.reasoning).toBe('テストタスクの見積もり')
      expect(data.questions).toEqual(['詳細を教えてください'])
    })

    it('APIキーが設定されていない場合の適切なエラーハンドリング', async () => {
      delete process.env.OPENAI_API_KEY

      const { AIService } = await import('@/lib/services/aiService')
      const mockEstimateTask = AIService.estimateTask as jest.Mock
      mockEstimateTask.mockRejectedValue(new Error('OpenAI API key is not configured'))

      const taskInput = {
        task: {
          title: 'テストタスク',
          priority: 'must' as const,
          // descriptionなし
        },
      }

      const request = new NextRequest('http://localhost:3000/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskInput),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('OpenAI APIキーが設定されていません')
    })
  })
})