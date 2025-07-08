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

    it('OpenAI APIが利用不可の場合にモック見積もりを返す', async () => {
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

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('hours')
      expect(data).toHaveProperty('confidence_score')
      expect(data).toHaveProperty('reasoning')
      expect(typeof data.hours).toBe('number')
      expect(data.hours).toBeGreaterThan(0)
    })

    it('プレゼンテーション関連のタスクで適切なモック見積もりを返す', async () => {
      delete process.env.OPENAI_API_KEY

      const { AIService } = await import('@/lib/services/aiService')
      const mockEstimateTask = AIService.estimateTask as jest.Mock
      mockEstimateTask.mockRejectedValue(new Error('OpenAI API key is not configured'))

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

      expect(response.status).toBe(200)
      expect(data.hours).toBe(4) // プレゼンテーション関連のタスクは4時間
      expect(data.reasoning).toContain('プレゼンテーション')
      expect(Array.isArray(data.questions)).toBe(true)
      expect(data.questions.length).toBeGreaterThan(0)
    })

    it('会議関連のタスクで適切なモック見積もりを返す', async () => {
      delete process.env.OPENAI_API_KEY

      const { AIService } = await import('@/lib/services/aiService')
      const mockEstimateTask = AIService.estimateTask as jest.Mock
      mockEstimateTask.mockRejectedValue(new Error('OpenAI API key is not configured'))

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

      expect(response.status).toBe(200)
      expect(data.hours).toBe(1) // 会議関連のタスクは1時間
      expect(data.reasoning).toContain('会議')
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

    it('優先度に基づいて信頼度スコアが調整される', async () => {
      delete process.env.OPENAI_API_KEY

      const { AIService } = await import('@/lib/services/aiService')
      const mockEstimateTask = AIService.estimateTask as jest.Mock
      mockEstimateTask.mockRejectedValue(new Error('OpenAI API key is not configured'))

      const taskInput = {
        task: {
          title: 'テストタスク',
          description: '詳細な説明があります', // 説明を追加して信頼度低下を防ぐ
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
      expect(data.confidence_score).toBeCloseTo(0.8, 1) // 0.7 + 0.1(must) = 0.8
    })

    it('詳細説明がない場合に追加質問が生成される', async () => {
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

      expect(response.status).toBe(200)
      expect(Array.isArray(data.questions)).toBe(true)
      expect(data.questions).toContain('タスクの詳細を教えていただけますか？')
    })
  })
})