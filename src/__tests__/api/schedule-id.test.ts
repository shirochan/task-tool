/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { PUT } from '@/app/api/schedule/[id]/route'
import { TaskService } from '@/lib/services/taskService'

// TaskServiceのモック
jest.mock('@/lib/services/taskService', () => ({
  TaskService: jest.fn().mockImplementation(() => ({
    updateTaskSchedule: jest.fn(),
  })),
}))

describe('/api/schedule/[id]', () => {
  let mockUpdateTaskSchedule: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateTaskSchedule = jest.fn()
    ;(TaskService as jest.Mock).mockImplementation(() => ({
      updateTaskSchedule: mockUpdateTaskSchedule,
    }))
  })

  describe('PUT', () => {
    it('スケジュールを正常に更新できる', async () => {
      const requestBody = {
        start_time: '10:00',
        end_time: '12:00',
        scheduled_date: '2024-01-08'
      }

      mockUpdateTaskSchedule.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('スケジュールが正常に更新されました')
      expect(mockUpdateTaskSchedule).toHaveBeenCalledWith(1, {
        start_time: '10:00',
        end_time: '12:00',
        scheduled_date: '2024-01-08'
      })
    })

    it('部分的な更新（開始時間のみ）ができる', async () => {
      const requestBody = {
        start_time: '09:00'
      }

      mockUpdateTaskSchedule.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('スケジュールが正常に更新されました')
      expect(mockUpdateTaskSchedule).toHaveBeenCalledWith(1, {
        start_time: '09:00'
      })
    })

    it('部分的な更新（終了時間のみ）ができる', async () => {
      const requestBody = {
        end_time: '17:00'
      }

      mockUpdateTaskSchedule.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('スケジュールが正常に更新されました')
      expect(mockUpdateTaskSchedule).toHaveBeenCalledWith(1, {
        end_time: '17:00'
      })
    })

    it('部分的な更新（日付のみ）ができる', async () => {
      const requestBody = {
        scheduled_date: '2024-01-09'
      }

      mockUpdateTaskSchedule.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('スケジュールが正常に更新されました')
      expect(mockUpdateTaskSchedule).toHaveBeenCalledWith(1, {
        scheduled_date: '2024-01-09'
      })
    })

    it('無効なスケジュールIDの場合は400エラーを返す', async () => {
      const requestBody = {
        start_time: '10:00'
      }

      const request = new NextRequest('http://localhost:3000/api/schedule/invalid', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: 'invalid' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('無効なスケジュールIDです')
    })

    it('更新するフィールドが指定されていない場合は400エラーを返す', async () => {
      const requestBody = {}

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('更新するフィールドを指定してください')
    })

    it('無効な日付形式の場合は400エラーを返す', async () => {
      const requestBody = {
        scheduled_date: '2024/01/08' // 無効な形式
      }

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('無効な日付形式です (YYYY-MM-DD)')
    })

    it('土曜日の日付は400エラーを返す', async () => {
      const requestBody = {
        scheduled_date: '2024-01-13' // 土曜日
      }

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('営業日（月曜日から金曜日）のみ指定できます')
    })

    it('日曜日の日付は400エラーを返す', async () => {
      const requestBody = {
        scheduled_date: '2024-01-14' // 日曜日
      }

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('営業日（月曜日から金曜日）のみ指定できます')
    })

    it('無効な開始時間形式の場合は400エラーを返す', async () => {
      const requestBody = {
        start_time: '25:00' // 無効な時間
      }

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('無効な開始時間形式です (HH:MM)')
    })

    it('無効な終了時間形式の場合は400エラーを返す', async () => {
      const requestBody = {
        end_time: '12:60' // 無効な分
      }

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('無効な終了時間形式です (HH:MM)')
    })

    it('開始時間が終了時間以降の場合は400エラーを返す', async () => {
      const requestBody = {
        start_time: '15:00',
        end_time: '14:00' // 開始時間より前
      }

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('開始時間は終了時間より前である必要があります')
    })

    it('開始時間と終了時間が同じ場合は400エラーを返す', async () => {
      const requestBody = {
        start_time: '10:00',
        end_time: '10:00' // 同じ時間
      }

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('開始時間は終了時間より前である必要があります')
    })

    it('存在しないスケジュールの更新は404エラーを返す', async () => {
      const requestBody = {
        start_time: '10:00'
      }

      mockUpdateTaskSchedule.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/schedule/999', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '999' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('スケジュールが見つからないか、更新に失敗しました')
      expect(mockUpdateTaskSchedule).toHaveBeenCalledWith(999, {
        start_time: '10:00'
      })
    })

    it('JSONの解析に失敗した場合は500エラーを返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('サーバーエラーが発生しました')
    })

    it('営業日の境界値テスト - 月曜日（成功）', async () => {
      const requestBody = {
        scheduled_date: '2024-01-08' // 月曜日
      }

      mockUpdateTaskSchedule.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)

      expect(response.status).toBe(200)
    })

    it('営業日の境界値テスト - 金曜日（成功）', async () => {
      const requestBody = {
        scheduled_date: '2024-01-12' // 金曜日
      }

      mockUpdateTaskSchedule.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)

      expect(response.status).toBe(200)
    })

    it('時間の境界値テスト - 00:00（成功）', async () => {
      const requestBody = {
        start_time: '00:00',
        end_time: '01:00'
      }

      mockUpdateTaskSchedule.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)

      expect(response.status).toBe(200)
    })

    it('時間の境界値テスト - 23:59（成功）', async () => {
      const requestBody = {
        start_time: '23:00',
        end_time: '23:59'
      }

      mockUpdateTaskSchedule.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '1' }) }
      const response = await PUT(request, context)

      expect(response.status).toBe(200)
    })

    it('数字のIDが文字列で渡された場合も正常に処理される', async () => {
      const requestBody = {
        start_time: '10:00'
      }

      mockUpdateTaskSchedule.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/schedule/123', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const context = { params: Promise.resolve({ id: '123' }) }
      const response = await PUT(request, context)

      expect(response.status).toBe(200)
      expect(mockUpdateTaskSchedule).toHaveBeenCalledWith(123, {
        start_time: '10:00'
      })
    })
  })
})