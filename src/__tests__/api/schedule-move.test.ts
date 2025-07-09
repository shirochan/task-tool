/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { PUT } from '@/app/api/schedule/move/route'
import { TaskService } from '@/lib/services/taskService'

// TaskServiceのモック
jest.mock('@/lib/services/taskService', () => ({
  TaskService: {
    getTaskById: jest.fn(),
    moveTaskToDate: jest.fn(),
    checkTimeConflicts: jest.fn(),
  },
}))

describe('/api/schedule/move', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PUT', () => {
    it('タスクを正常に移動できる', async () => {
      const requestBody = {
        taskId: 1,
        targetDate: '2024-01-08',
        targetTime: '10:00'
      }

      const mockTask = {
        id: 1,
        title: 'テストタスク',
        priority: 'must',
        estimated_hours: 2,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      ;(TaskService.getTaskById as jest.Mock).mockReturnValue(mockTask)
      ;(TaskService.checkTimeConflicts as jest.Mock).mockReturnValue(false)
      ;(TaskService.moveTaskToDate as jest.Mock).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/move', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('タスクが正常に移動されました')
      expect(TaskService.getTaskById).toHaveBeenCalledWith(1)
      expect(TaskService.checkTimeConflicts).toHaveBeenCalledWith(
        '2024-01-08',
        '10:00',
        '12:00', // 2時間後
        1
      )
      expect(TaskService.moveTaskToDate).toHaveBeenCalledWith(1, '2024-01-08', '10:00')
    })

    it('時間指定なしでタスクを移動できる', async () => {
      const requestBody = {
        taskId: 1,
        targetDate: '2024-01-08'
      }

      const mockTask = {
        id: 1,
        title: 'テストタスク',
        priority: 'must',
        estimated_hours: 1,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      ;(TaskService.getTaskById as jest.Mock).mockReturnValue(mockTask)
      ;(TaskService.checkTimeConflicts as jest.Mock).mockReturnValue(false)
      ;(TaskService.moveTaskToDate as jest.Mock).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/move', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('タスクが正常に移動されました')
      expect(TaskService.checkTimeConflicts).toHaveBeenCalledWith(
        '2024-01-08',
        '10:00', // デフォルト時間
        '11:00', // 1時間後
        1
      )
      expect(TaskService.moveTaskToDate).toHaveBeenCalledWith(1, '2024-01-08', undefined)
    })

    it('必須パラメーターが不足している場合は400エラーを返す', async () => {
      const requestBody = {
        targetDate: '2024-01-08'
        // taskId が不足
      }

      const request = new NextRequest('http://localhost:3000/api/schedule/move', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('taskId と targetDate は必須です')
    })

    it('無効な日付形式の場合は400エラーを返す', async () => {
      const requestBody = {
        taskId: 1,
        targetDate: '2024/01/08' // 無効な形式
      }

      const request = new NextRequest('http://localhost:3000/api/schedule/move', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('無効な日付形式です (YYYY-MM-DD)')
    })

    it('無効な時間形式の場合は400エラーを返す', async () => {
      const requestBody = {
        taskId: 1,
        targetDate: '2024-01-08',
        targetTime: '25:00' // 無効な時間
      }

      const request = new NextRequest('http://localhost:3000/api/schedule/move', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('無効な時間形式です (HH:MM)')
    })

    it('土曜日への移動は400エラーを返す', async () => {
      const requestBody = {
        taskId: 1,
        targetDate: '2024-01-13' // 土曜日
      }

      const request = new NextRequest('http://localhost:3000/api/schedule/move', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('営業日（月曜日から金曜日）のみ指定できます')
    })

    it('日曜日への移動は400エラーを返す', async () => {
      const requestBody = {
        taskId: 1,
        targetDate: '2024-01-14' // 日曜日
      }

      const request = new NextRequest('http://localhost:3000/api/schedule/move', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('営業日（月曜日から金曜日）のみ指定できます')
    })

    it('存在しないタスクの場合は404エラーを返す', async () => {
      const requestBody = {
        taskId: 999,
        targetDate: '2024-01-08'
      }

      ;(TaskService.getTaskById as jest.Mock).mockReturnValue(null)

      const request = new NextRequest('http://localhost:3000/api/schedule/move', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('タスクが見つかりません')
      expect(TaskService.getTaskById).toHaveBeenCalledWith(999)
    })

    it('時間競合がある場合は409エラーを返す', async () => {
      const requestBody = {
        taskId: 1,
        targetDate: '2024-01-08',
        targetTime: '10:00'
      }

      const mockTask = {
        id: 1,
        title: 'テストタスク',
        priority: 'must',
        estimated_hours: 2,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      ;(TaskService.getTaskById as jest.Mock).mockReturnValue(mockTask)
      ;(TaskService.checkTimeConflicts as jest.Mock).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/move', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('指定された時間帯に他のタスクが既にスケジュールされています')
      expect(TaskService.checkTimeConflicts).toHaveBeenCalledWith(
        '2024-01-08',
        '10:00',
        '12:00',
        1
      )
      expect(TaskService.moveTaskToDate).not.toHaveBeenCalled()
    })

    it('タスクの移動に失敗した場合は500エラーを返す', async () => {
      const requestBody = {
        taskId: 1,
        targetDate: '2024-01-08'
      }

      const mockTask = {
        id: 1,
        title: 'テストタスク',
        priority: 'must',
        estimated_hours: 1,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      ;(TaskService.getTaskById as jest.Mock).mockReturnValue(mockTask)
      ;(TaskService.checkTimeConflicts as jest.Mock).mockReturnValue(false)
      ;(TaskService.moveTaskToDate as jest.Mock).mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/schedule/move', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('タスクの移動に失敗しました')
      expect(TaskService.moveTaskToDate).toHaveBeenCalledWith(1, '2024-01-08', undefined)
    })

    it('estimated_hoursが未設定の場合はデフォルト値を使用する', async () => {
      const requestBody = {
        taskId: 1,
        targetDate: '2024-01-08',
        targetTime: '10:00'
      }

      const mockTask = {
        id: 1,
        title: 'テストタスク',
        priority: 'must',
        estimated_hours: undefined, // 未設定
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      ;(TaskService.getTaskById as jest.Mock).mockReturnValue(mockTask)
      ;(TaskService.checkTimeConflicts as jest.Mock).mockReturnValue(false)
      ;(TaskService.moveTaskToDate as jest.Mock).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/move', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
      expect(TaskService.checkTimeConflicts).toHaveBeenCalledWith(
        '2024-01-08',
        '10:00',
        '11:00', // デフォルト1時間後
        1
      )
    })

    it('JSONの解析に失敗した場合は500エラーを返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/schedule/move', {
        method: 'PUT',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('サーバーエラーが発生しました')
    })

    it('境界値のテスト - 小数の見積もり時間', async () => {
      const requestBody = {
        taskId: 1,
        targetDate: '2024-01-08',
        targetTime: '10:00'
      }

      const mockTask = {
        id: 1,
        title: 'テストタスク',
        priority: 'must',
        estimated_hours: 1.5, // 小数
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      ;(TaskService.getTaskById as jest.Mock).mockReturnValue(mockTask)
      ;(TaskService.checkTimeConflicts as jest.Mock).mockReturnValue(false)
      ;(TaskService.moveTaskToDate as jest.Mock).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/move', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
      expect(TaskService.checkTimeConflicts).toHaveBeenCalledWith(
        '2024-01-08',
        '10:00',
        '11:30', // 1.5時間後
        1
      )
    })

    it('営業日の境界値テスト - 月曜日（成功）', async () => {
      const requestBody = {
        taskId: 1,
        targetDate: '2024-01-08' // 月曜日
      }

      const mockTask = {
        id: 1,
        title: 'テストタスク',
        priority: 'must',
        estimated_hours: 1,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      ;(TaskService.getTaskById as jest.Mock).mockReturnValue(mockTask)
      ;(TaskService.checkTimeConflicts as jest.Mock).mockReturnValue(false)
      ;(TaskService.moveTaskToDate as jest.Mock).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/move', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
    })

    it('営業日の境界値テスト - 金曜日（成功）', async () => {
      const requestBody = {
        taskId: 1,
        targetDate: '2024-01-12' // 金曜日
      }

      const mockTask = {
        id: 1,
        title: 'テストタスク',
        priority: 'must',
        estimated_hours: 1,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      ;(TaskService.getTaskById as jest.Mock).mockReturnValue(mockTask)
      ;(TaskService.checkTimeConflicts as jest.Mock).mockReturnValue(false)
      ;(TaskService.moveTaskToDate as jest.Mock).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/move', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
    })
  })
})