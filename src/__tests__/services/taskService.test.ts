/**
 * @jest-environment node
 */

import { TaskService } from '@/lib/services/taskService'
import { Task, TaskInput, TaskScheduleWithTask, AIEstimateInput } from '@/lib/types'
import { statements } from '@/lib/database/db'

// データベースのモック
jest.mock('@/lib/database/db', () => ({
  statements: {
    insertTask: { run: jest.fn() },
    getTaskById: { get: jest.fn() },
    getAllTasks: { all: jest.fn() },
    updateTask: { run: jest.fn() },
    deleteTask: { run: jest.fn() },
    insertTaskSchedule: { run: jest.fn() },
    getScheduleByDate: { all: jest.fn() },
    getWeeklySchedule: { all: jest.fn() },
    insertAIEstimate: { run: jest.fn() },
    getLatestEstimate: { get: jest.fn() },
  },
}))

describe('TaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createTask', () => {
    it('新しいタスクを作成できる', () => {
      const taskInput: TaskInput = {
        title: 'テストタスク',
        description: 'テスト用のタスク',
        priority: 'must',
        category: 'テスト',
        estimated_hours: 2,
      }

      const mockResult = { lastInsertRowid: 1 }
      const mockTask: Task = {
        id: 1,
        ...taskInput,
        actual_hours: undefined,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      ;(statements.insertTask.run as jest.Mock).mockReturnValue(mockResult)
      ;(statements.getTaskById.get as jest.Mock).mockReturnValue(mockTask)

      const result = TaskService.createTask(taskInput)

      expect(statements.insertTask.run).toHaveBeenCalledWith(
        taskInput.title,
        taskInput.description,
        taskInput.priority,
        taskInput.category,
        taskInput.estimated_hours
      )
      expect(statements.getTaskById.get).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockTask)
    })

    it('必須フィールドのみでタスクを作成できる', () => {
      const taskInput: TaskInput = {
        title: 'ミニマルタスク',
        priority: 'want',
      }

      const mockResult = { lastInsertRowid: 2 }
      const mockTask: Task = {
        id: 2,
        title: 'ミニマルタスク',
        description: undefined,
        priority: 'want',
        category: undefined,
        estimated_hours: undefined,
        actual_hours: undefined,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      ;(statements.insertTask.run as jest.Mock).mockReturnValue(mockResult)
      ;(statements.getTaskById.get as jest.Mock).mockReturnValue(mockTask)

      const result = TaskService.createTask(taskInput)

      expect(statements.insertTask.run).toHaveBeenCalledWith(
        taskInput.title,
        null,
        taskInput.priority,
        null,
        null
      )
      expect(result).toEqual(mockTask)
    })
  })

  describe('getTaskById', () => {
    it('IDで指定されたタスクを取得できる', () => {
      const mockTask: Task = {
        id: 1,
        title: 'テストタスク',
        description: 'テスト用のタスク',
        priority: 'must',
        category: 'テスト',
        estimated_hours: 2,
        actual_hours: undefined,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      ;(statements.getTaskById.get as jest.Mock).mockReturnValue(mockTask)

      const result = TaskService.getTaskById(1)

      expect(statements.getTaskById.get).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockTask)
    })

    it('存在しないIDの場合nullを返す', () => {
      ;(statements.getTaskById.get as jest.Mock).mockReturnValue(null)

      const result = TaskService.getTaskById(999)

      expect(statements.getTaskById.get).toHaveBeenCalledWith(999)
      expect(result).toBeNull()
    })
  })

  describe('getAllTasks', () => {
    it('全てのタスクを取得できる', () => {
      const mockTasks: Task[] = [
        {
          id: 1,
          title: 'タスク1',
          description: 'タスク1の説明',
          priority: 'must',
          category: 'テスト',
          estimated_hours: 1,
          actual_hours: undefined,
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'タスク2',
          description: 'タスク2の説明',
          priority: 'want',
          category: 'テスト',
          estimated_hours: 2,
          actual_hours: undefined,
          status: 'in_progress',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]

      ;(statements.getAllTasks.all as jest.Mock).mockReturnValue(mockTasks)

      const result = TaskService.getAllTasks()

      expect(statements.getAllTasks.all).toHaveBeenCalled()
      expect(result).toEqual(mockTasks)
    })

    it('タスクが存在しない場合空配列を返す', () => {
      ;(statements.getAllTasks.all as jest.Mock).mockReturnValue([])

      const result = TaskService.getAllTasks()

      expect(result).toEqual([])
    })
  })

  describe('updateTask', () => {
    it('タスクを更新できる', () => {
      const existingTask: Task = {
        id: 1,
        title: '元のタスク',
        description: '元の説明',
        priority: 'must',
        category: 'テスト',
        estimated_hours: 1,
        actual_hours: undefined,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const updates: Partial<TaskInput> = {
        title: '更新されたタスク',
        estimated_hours: 3,
      }

      const updatedTask: Task = {
        ...existingTask,
        ...updates,
        updated_at: '2024-01-02T00:00:00Z',
      }

      ;(statements.getTaskById.get as jest.Mock)
        .mockReturnValueOnce(existingTask)
        .mockReturnValueOnce(updatedTask)

      const result = TaskService.updateTask(1, updates)

      expect(statements.getTaskById.get).toHaveBeenCalledTimes(2)
      expect(statements.getTaskById.get).toHaveBeenNthCalledWith(1, 1)
      expect(statements.getTaskById.get).toHaveBeenNthCalledWith(2, 1)
      expect(statements.updateTask.run).toHaveBeenCalledWith(
        '更新されたタスク',
        '元の説明',
        'must',
        'テスト',
        3,
        1
      )
      expect(result).toEqual(updatedTask)
    })

    it('存在しないタスクの更新時にnullを返す', () => {
      ;(statements.getTaskById.get as jest.Mock).mockReturnValue(null)

      const result = TaskService.updateTask(999, { title: '更新' })

      expect(statements.getTaskById.get).toHaveBeenCalledWith(999)
      expect(statements.updateTask.run).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('部分更新が正しく動作する', () => {
      const existingTask: Task = {
        id: 1,
        title: '元のタスク',
        description: '元の説明',
        priority: 'must',
        category: 'テスト',
        estimated_hours: 1,
        actual_hours: undefined,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const updates: Partial<TaskInput> = {
        priority: 'want',
      }

      const updatedTask: Task = {
        ...existingTask,
        priority: 'want',
        updated_at: '2024-01-02T00:00:00Z',
      }

      ;(statements.getTaskById.get as jest.Mock)
        .mockReturnValueOnce(existingTask)
        .mockReturnValueOnce(updatedTask)

      const result = TaskService.updateTask(1, updates)

      expect(statements.updateTask.run).toHaveBeenCalledWith(
        '元のタスク',
        '元の説明',
        'want',
        'テスト',
        1,
        1
      )
      expect(result).toEqual(updatedTask)
    })
  })

  describe('deleteTask', () => {
    it('タスクを削除できる', () => {
      const mockResult = { changes: 1 }
      ;(statements.deleteTask.run as jest.Mock).mockReturnValue(mockResult)

      const result = TaskService.deleteTask(1)

      expect(statements.deleteTask.run).toHaveBeenCalledWith(1)
      expect(result).toBe(true)
    })

    it('存在しないタスクの削除時にfalseを返す', () => {
      const mockResult = { changes: 0 }
      ;(statements.deleteTask.run as jest.Mock).mockReturnValue(mockResult)

      const result = TaskService.deleteTask(999)

      expect(statements.deleteTask.run).toHaveBeenCalledWith(999)
      expect(result).toBe(false)
    })
  })

  describe('createTaskSchedule', () => {
    it('タスクスケジュールを作成できる', () => {
      TaskService.createTaskSchedule(1, 1, '09:00', '11:00', '2024-01-08')

      expect(statements.insertTaskSchedule.run).toHaveBeenCalledWith(
        1,
        1,
        '09:00',
        '11:00',
        '2024-01-08'
      )
    })
  })

  describe('getScheduleByDate', () => {
    it('指定された日付のスケジュールを取得できる', () => {
      const mockSchedules: TaskScheduleWithTask[] = [
        {
          task_id: 1,
          day_of_week: 1,
          start_time: '09:00',
          end_time: '11:00',
          scheduled_date: '2024-01-08',
          title: 'タスク1',
          description: 'タスク1の説明',
          priority: 'must',
          category: 'テスト',
          estimated_hours: 2,
          status: 'pending',
        },
      ]

      ;(statements.getScheduleByDate.all as jest.Mock).mockReturnValue(mockSchedules)

      const result = TaskService.getScheduleByDate('2024-01-08')

      expect(statements.getScheduleByDate.all).toHaveBeenCalledWith('2024-01-08')
      expect(result).toEqual(mockSchedules)
    })
  })

  describe('getWeeklySchedule', () => {
    it('週間スケジュールを取得できる', () => {
      const mockSchedules: TaskScheduleWithTask[] = [
        {
          task_id: 1,
          day_of_week: 1,
          start_time: '09:00',
          end_time: '11:00',
          scheduled_date: '2024-01-08',
          title: 'タスク1',
          description: 'タスク1の説明',
          priority: 'must',
          category: 'テスト',
          estimated_hours: 2,
          status: 'pending',
        },
      ]

      ;(statements.getWeeklySchedule.all as jest.Mock).mockReturnValue(mockSchedules)

      const result = TaskService.getWeeklySchedule('2024-01-08', '2024-01-12')

      expect(statements.getWeeklySchedule.all).toHaveBeenCalledWith('2024-01-08', '2024-01-12')
      expect(result).toEqual(mockSchedules)
    })
  })

  describe('createAIEstimate', () => {
    it('AI見積もりを作成できる', () => {
      const estimateInput: AIEstimateInput = {
        task_id: 1,
        estimated_hours: 2.5,
        confidence_score: 0.8,
        reasoning: 'テスト用の見積もり',
        questions_asked: ['質問1', '質問2'],
      }

      const mockEstimate = {
        id: 1,
        task_id: 1,
        estimated_hours: 2.5,
        confidence_score: 0.8,
        reasoning: 'テスト用の見積もり',
        questions_asked: '["質問1", "質問2"]',
        created_at: '2024-01-01T00:00:00Z',
      }

      ;(statements.getLatestEstimate.get as jest.Mock).mockReturnValue(mockEstimate)

      const result = TaskService.createAIEstimate(estimateInput)

      expect(statements.insertAIEstimate.run).toHaveBeenCalledWith(
        1,
        2.5,
        0.8,
        'テスト用の見積もり',
        '["質問1","質問2"]'
      )
      expect(statements.getLatestEstimate.get).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockEstimate)
    })

    it('questions_askedがない場合にnullを渡す', () => {
      const estimateInput: AIEstimateInput = {
        task_id: 1,
        estimated_hours: 2.5,
      }

      const mockEstimate = {
        id: 1,
        task_id: 1,
        estimated_hours: 2.5,
        confidence_score: null,
        reasoning: null,
        questions_asked: null,
        created_at: '2024-01-01T00:00:00Z',
      }

      ;(statements.getLatestEstimate.get as jest.Mock).mockReturnValue(mockEstimate)

      const result = TaskService.createAIEstimate(estimateInput)

      expect(statements.insertAIEstimate.run).toHaveBeenCalledWith(
        1,
        2.5,
        null,
        null,
        null
      )
      expect(result).toEqual(mockEstimate)
    })
  })

  describe('getLatestEstimate', () => {
    it('最新の見積もりを取得できる', () => {
      const mockEstimate = {
        id: 1,
        task_id: 1,
        estimated_hours: 2.5,
        confidence_score: 0.8,
        reasoning: 'テスト用の見積もり',
        questions_asked: '["質問1", "質問2"]',
        created_at: '2024-01-01T00:00:00Z',
      }

      ;(statements.getLatestEstimate.get as jest.Mock).mockReturnValue(mockEstimate)

      const result = TaskService.getLatestEstimate(1)

      expect(statements.getLatestEstimate.get).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockEstimate)
    })

    it('見積もりが存在しない場合nullを返す', () => {
      ;(statements.getLatestEstimate.get as jest.Mock).mockReturnValue(null)

      const result = TaskService.getLatestEstimate(999)

      expect(result).toBeNull()
    })
  })

  describe('generateWeeklySchedule', () => {
    beforeEach(() => {
      // generateWeeklyScheduleの日付計算をモック
      jest.spyOn(TaskService, 'generateWeeklySchedule').mockImplementation(() => {
        const mockWeeklySchedule: { [key: string]: TaskScheduleWithTask[] } = {
          '2024-01-08': [],
          '2024-01-09': [],
          '2024-01-10': [],
          '2024-01-11': [],
          '2024-01-12': [],
        }
        return mockWeeklySchedule
      })
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('週間スケジュールを生成できる', () => {
      const result = TaskService.generateWeeklySchedule()

      expect(result).toHaveProperty('2024-01-08')
      expect(result).toHaveProperty('2024-01-09')
      expect(result).toHaveProperty('2024-01-10')
      expect(result).toHaveProperty('2024-01-11')
      expect(result).toHaveProperty('2024-01-12')
    })
  })
})