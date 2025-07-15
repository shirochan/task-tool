/**
 * @jest-environment node
 */

import { GET, POST } from '@/app/api/tasks/route'
import { GET as getTaskById, PUT, DELETE } from '@/app/api/tasks/[id]/route'
import { NextRequest } from 'next/server'
import { defaultTestTasks } from '@/test-utils/testData'

// TaskServiceのモック
jest.mock('@/lib/services/taskService', () => ({
  TaskService: jest.fn().mockImplementation(() => ({
    getAllTasks: jest.fn(),
    createTask: jest.fn(),
    getTaskById: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
  })),
}))

// Mock variables scoped globally for both describe blocks
let mockGetAllTasks: jest.Mock
let mockCreateTask: jest.Mock
let mockGetTaskById: jest.Mock
let mockUpdateTask: jest.Mock
let mockDeleteTask: jest.Mock

async function setupMocks() {
  mockGetAllTasks = jest.fn()
  mockCreateTask = jest.fn()
  mockGetTaskById = jest.fn()
  mockUpdateTask = jest.fn()
  mockDeleteTask = jest.fn()
  
  const { TaskService } = await import('@/lib/services/taskService')
  ;(TaskService as jest.Mock).mockImplementation(() => ({
    getAllTasks: mockGetAllTasks,
    createTask: mockCreateTask,
    getTaskById: mockGetTaskById,
    updateTask: mockUpdateTask,
    deleteTask: mockDeleteTask,
  }))
}

describe('/api/tasks', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    await setupMocks()
  })

  describe('GET /api/tasks', () => {
    it('全てのタスクを取得できる', async () => {
      mockGetAllTasks.mockReturnValue(defaultTestTasks)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(2)
      expect(data[0]).toHaveProperty('id')
      expect(data[0]).toHaveProperty('title')
      expect(data[0]).toHaveProperty('priority')
    })

    it('空の配列でも正常に処理される', async () => {
      mockGetAllTasks.mockReturnValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(0)
    })
  })

  describe('POST /api/tasks', () => {
    it('新しいタスクを作成できる', async () => {

      const newTaskInput = {
        title: '新しいタスク',
        description: 'テスト用の新しいタスクです',
        priority: 'must' as const,
        category: 'テスト',
        estimated_hours: 2,
      }

      const createdTask = {
        id: 3,
        ...newTaskInput,
        actual_hours: undefined,
        status: 'pending' as const,
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      }

      mockCreateTask.mockReturnValue(createdTask)

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskInput),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toHaveProperty('id')
      expect(data.title).toBe(newTaskInput.title)
      expect(data.priority).toBe(newTaskInput.priority)
      expect(data.status).toBe('pending')
      expect(mockCreateTask).toHaveBeenCalledWith(newTaskInput)
    })

    it('必須フィールドが不足している場合にもタスクが作成される（現在の実装）', async () => {

      const invalidInput = {
        description: 'タイトルが不足しています',
        priority: 'must' as const,
      }

      const createdTask = {
        id: 4,
        title: undefined,
        description: invalidInput.description,
        priority: invalidInput.priority,
        category: undefined,
        estimated_hours: undefined,
        actual_hours: undefined,
        status: 'pending' as const,
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      }
      
      mockCreateTask.mockReturnValue(createdTask)

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidInput),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toHaveProperty('id')
    })

    it('不正なpriorityが指定された場合にもタスクが作成される（現在の実装）', async () => {

      const invalidInput = {
        title: 'テストタスク',
        priority: 'invalid' as 'must' | 'want',
      }

      const createdTask = {
        id: 5,
        title: invalidInput.title,
        description: undefined,
        priority: invalidInput.priority,
        category: undefined,
        estimated_hours: undefined,
        actual_hours: undefined,
        status: 'pending' as const,
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      }
      
      mockCreateTask.mockReturnValue(createdTask)

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidInput),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toHaveProperty('id')
    })
  })
})

describe('/api/tasks/[id]', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    await setupMocks()
  })

  describe('GET /api/tasks/[id]', () => {
    it('指定されたIDのタスクを取得できる', async () => {
      
      const targetTask = defaultTestTasks[0]
      mockGetTaskById.mockReturnValue(targetTask)

      const request = new NextRequest('http://localhost:3000/api/tasks/1')
      const response = await getTaskById(request, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(1)
      expect(data.title).toBe(targetTask.title)
      expect(mockGetTaskById).toHaveBeenCalledWith(1)
    })

    it('存在しないIDが指定された場合に404を返す', async () => {
      mockGetTaskById.mockReturnValue(null)

      const request = new NextRequest('http://localhost:3000/api/tasks/999')
      const response = await getTaskById(request, { params: Promise.resolve({ id: '999' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toHaveProperty('error')
      expect(mockGetTaskById).toHaveBeenCalledWith(999)
    })

    it('不正なIDが指定された場合にエラーを返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/tasks/invalid')
      const response = await getTaskById(request, { params: Promise.resolve({ id: 'invalid' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error')
    })
  })

  describe('PUT /api/tasks/[id]', () => {
    it('タスクを更新できる', async () => {

      const updates = {
        title: '更新されたタスク',
        estimated_hours: 3,
      }

      const updatedTask = {
        ...defaultTestTasks[0],
        ...updates,
        updated_at: '2024-01-03T00:00:00Z',
      }

      mockUpdateTask.mockReturnValue(updatedTask)

      const request = new NextRequest('http://localhost:3000/api/tasks/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe(updates.title)
      expect(data.estimated_hours).toBe(updates.estimated_hours)
      expect(mockUpdateTask).toHaveBeenCalledWith(1, updates)
    })

    it('存在しないタスクの更新時に404を返す', async () => {
      mockUpdateTask.mockReturnValue(null)

      const updates = { title: '存在しないタスク' }

      const request = new NextRequest('http://localhost:3000/api/tasks/999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const response = await PUT(request, { params: Promise.resolve({ id: '999' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toHaveProperty('error')
      expect(mockUpdateTask).toHaveBeenCalledWith(999, updates)
    })
  })

  describe('DELETE /api/tasks/[id]', () => {
    it('タスクを削除できる', async () => {
      mockDeleteTask.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/tasks/1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('message')
      expect(mockDeleteTask).toHaveBeenCalledWith(1)
    })

    it('存在しないタスクの削除時に404を返す', async () => {
      mockDeleteTask.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/tasks/999', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: '999' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toHaveProperty('error')
      expect(mockDeleteTask).toHaveBeenCalledWith(999)
    })
  })
})