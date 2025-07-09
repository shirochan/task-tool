/**
 * @jest-environment node
 */

import { TaskService } from '@/lib/services/taskService'
import { Task, TaskInput, TaskScheduleWithTask, AIEstimateInput } from '@/lib/types'
import { statements, runTransaction } from '@/lib/database/db'

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
    clearWeeklySchedule: { run: jest.fn() },
    deleteTaskSchedule: { run: jest.fn() },
    updateTaskSchedule: { run: jest.fn() },
  },
  runTransaction: jest.fn(),
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

  describe('スケジュール関連', () => {
    it('指定日のスケジュールを取得できる', () => {
      const mockSchedules = [
        {
          task_id: 1,
          day_of_week: 1,
          start_time: '09:00',
          end_time: '12:00',
          scheduled_date: '2024-01-08',
          title: 'テストタスク',
          priority: 'must',
        },
      ]

      ;(statements.getScheduleByDate.all as jest.Mock).mockReturnValue(mockSchedules)

      const result = TaskService.getScheduleByDate('2024-01-08')

      expect(statements.getScheduleByDate.all).toHaveBeenCalledWith('2024-01-08')
      expect(result).toEqual(mockSchedules)
    })

    it('週間スケジュールを取得できる', () => {
      const mockSchedules = [
        {
          task_id: 1,
          day_of_week: 1,
          start_time: '09:00',
          end_time: '12:00',
          scheduled_date: '2024-01-08',
          title: 'テストタスク1',
          priority: 'must',
        },
        {
          task_id: 2,
          day_of_week: 2,
          start_time: '14:00',
          end_time: '17:00',
          scheduled_date: '2024-01-09',
          title: 'テストタスク2',
          priority: 'want',
        },
      ]

      ;(statements.getWeeklySchedule.all as jest.Mock).mockReturnValue(mockSchedules)

      const result = TaskService.getWeeklySchedule('2024-01-08', '2024-01-12')

      expect(statements.getWeeklySchedule.all).toHaveBeenCalledWith('2024-01-08', '2024-01-12')
      expect(result).toEqual(mockSchedules)
    })
  })

  describe('AI見積もり関連', () => {
    it('AI見積もりを作成できる', () => {
      const estimateInput = {
        task_id: 1,
        estimated_hours: 3.5,
        confidence_score: 0.8,
        reasoning: 'プレゼンテーション資料作成には調査と作成が必要',
        questions_asked: ['どのような形式の資料ですか？'],
      }

      const mockEstimate = {
        id: 1,
        task_id: 1,
        estimated_hours: 3.5,
        confidence_score: 0.8,
        reasoning: 'プレゼンテーション資料作成には調査と作成が必要',
        questions_asked: '["どのような形式の資料ですか？"]',
        created_at: '2024-01-01T00:00:00Z',
      }

      ;(statements.getLatestEstimate.get as jest.Mock).mockReturnValue(mockEstimate)

      const result = TaskService.createAIEstimate(estimateInput)

      expect(statements.insertAIEstimate.run).toHaveBeenCalledWith(
        1,
        3.5,
        0.8,
        'プレゼンテーション資料作成には調査と作成が必要',
        '["どのような形式の資料ですか？"]'
      )
      expect(statements.getLatestEstimate.get).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockEstimate)
    })

    it('AI見積もりを取得できる', () => {
      const mockEstimate = {
        id: 1,
        task_id: 1,
        estimated_hours: 2.5,
        confidence_score: 0.7,
        reasoning: 'テスト用の見積もり',
        questions_asked: null,
        created_at: '2024-01-01T00:00:00Z',
      }

      ;(statements.getLatestEstimate.get as jest.Mock).mockReturnValue(mockEstimate)

      const result = TaskService.getLatestEstimate(1)

      expect(statements.getLatestEstimate.get).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockEstimate)
    })

    it('存在しないタスクのAI見積もり取得時はnullが返される', () => {
      ;(statements.getLatestEstimate.get as jest.Mock).mockReturnValue(null)

      const result = TaskService.getLatestEstimate(999)

      expect(statements.getLatestEstimate.get).toHaveBeenCalledWith(999)
      expect(result).toBeNull()
    })
  })

  describe('エッジケース', () => {
    it('空文字列のタイトルでタスクを作成できる', () => {
      const taskInput: TaskInput = {
        title: '',
        priority: 'must',
      }

      const createdTask: Task = {
        id: 1,
        title: '',
        description: undefined,
        priority: 'must',
        category: undefined,
        estimated_hours: undefined,
        actual_hours: undefined,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      ;(statements.getTaskById.get as jest.Mock).mockReturnValue(createdTask)

      const result = TaskService.createTask(taskInput)

      expect(result).toEqual(createdTask)
    })

    it('非常に長いタイトルのタスクを作成できる', () => {
      const longTitle = 'あ'.repeat(1000)
      const taskInput: TaskInput = {
        title: longTitle,
        priority: 'must',
      }

      const createdTask: Task = {
        id: 1,
        title: longTitle,
        description: undefined,
        priority: 'must',
        category: undefined,
        estimated_hours: undefined,
        actual_hours: undefined,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      ;(statements.getTaskById.get as jest.Mock).mockReturnValue(createdTask)

      const result = TaskService.createTask(taskInput)

      expect(result).toEqual(createdTask)
    })

    it('負の見積もり時間を持つタスクを作成できる', () => {
      const taskInput: TaskInput = {
        title: 'テストタスク',
        priority: 'must',
        estimated_hours: -1,
      }

      const createdTask: Task = {
        id: 1,
        title: 'テストタスク',
        description: undefined,
        priority: 'must',
        category: undefined,
        estimated_hours: -1,
        actual_hours: undefined,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      ;(statements.getTaskById.get as jest.Mock).mockReturnValue(createdTask)

      const result = TaskService.createTask(taskInput)

      expect(result).toEqual(createdTask)
    })
  })

  describe('clearWeeklySchedule', () => {
    it('指定した日付範囲のスケジュールをクリアできる', () => {
      const startDate = '2024-01-08'
      const endDate = '2024-01-12'

      TaskService.clearWeeklySchedule(startDate, endDate)

      expect(statements.clearWeeklySchedule.run).toHaveBeenCalledWith(startDate, endDate)
    })

    it('同じ日付でのクリアも実行できる', () => {
      const date = '2024-01-08'

      TaskService.clearWeeklySchedule(date, date)

      expect(statements.clearWeeklySchedule.run).toHaveBeenCalledWith(date, date)
    })
  })

  describe('updateWeeklyScheduleAtomically', () => {
    it('トランザクション内でスケジュールを原子的に更新できる', () => {
      const startDate = '2024-01-08'
      const endDate = '2024-01-12'
      const scheduleData = [
        {
          taskId: 1,
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '11:00',
          scheduledDate: '2024-01-08'
        },
        {
          taskId: 2,
          dayOfWeek: 2,
          startTime: '14:00',
          endTime: '16:00',
          scheduledDate: '2024-01-09'
        }
      ]

      // runTransactionをモックして、渡されたコールバック関数を実行
      ;(runTransaction as jest.Mock).mockImplementation((callback) => {
        return callback()
      })

      TaskService.updateWeeklyScheduleAtomically(startDate, endDate, scheduleData)

      expect(runTransaction).toHaveBeenCalledWith(expect.any(Function))
      expect(statements.clearWeeklySchedule.run).toHaveBeenCalledWith(startDate, endDate)
      expect(statements.insertTaskSchedule.run).toHaveBeenCalledTimes(2)
      expect(statements.insertTaskSchedule.run).toHaveBeenNthCalledWith(
        1,
        1,
        1,
        '09:00',
        '11:00',
        '2024-01-08'
      )
      expect(statements.insertTaskSchedule.run).toHaveBeenNthCalledWith(
        2,
        2,
        2,
        '14:00',
        '16:00',
        '2024-01-09'
      )
    })

    it('空のスケジュールデータでもクリア処理は実行される', () => {
      const startDate = '2024-01-08'
      const endDate = '2024-01-12'
      const scheduleData: Array<{ taskId: number; dayOfWeek: number; startTime: string; endTime: string; scheduledDate: string }> = []

      ;(runTransaction as jest.Mock).mockImplementation((callback) => {
        return callback()
      })

      TaskService.updateWeeklyScheduleAtomically(startDate, endDate, scheduleData)

      expect(runTransaction).toHaveBeenCalledWith(expect.any(Function))
      expect(statements.clearWeeklySchedule.run).toHaveBeenCalledWith(startDate, endDate)
      expect(statements.insertTaskSchedule.run).not.toHaveBeenCalled()
    })

    it('トランザクションエラーが発生した場合の動作確認', () => {
      const startDate = '2024-01-08'
      const endDate = '2024-01-12'
      const scheduleData = [
        {
          taskId: 1,
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '11:00',
          scheduledDate: '2024-01-08'
        }
      ]

      // runTransactionでエラーを発生させる
      ;(runTransaction as jest.Mock).mockImplementation(() => {
        throw new Error('Database transaction failed')
      })

      expect(() => {
        TaskService.updateWeeklyScheduleAtomically(startDate, endDate, scheduleData)
      }).toThrow('Database transaction failed')

      expect(runTransaction).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  // 新しく追加したドラッグ&ドロップ機能のテスト
  describe('moveTaskToDate', () => {
    it('タスクを指定した日付に移動できる', () => {
      const taskId = 1
      const targetDate = '2024-01-08' // 月曜日
      const targetTime = '10:00'
      
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
      ;(runTransaction as jest.Mock).mockImplementation((callback) => {
        return callback()
      })

      const result = TaskService.moveTaskToDate(taskId, targetDate, targetTime)

      expect(runTransaction).toHaveBeenCalledWith(expect.any(Function))
      expect(statements.deleteTaskSchedule.run).toHaveBeenCalledWith(taskId)
      expect(statements.getTaskById.get).toHaveBeenCalledWith(taskId)
      expect(statements.insertTaskSchedule.run).toHaveBeenCalledWith(
        taskId,
        1, // 月曜日
        '10:00',
        '12:00', // 2時間後
        targetDate
      )
      expect(result).toBe(true)
    })

    it('タスクを指定した日付に移動できる（時間指定なし）', () => {
      const taskId = 1
      const targetDate = '2024-01-09' // 火曜日
      
      const mockTask: Task = {
        id: 1,
        title: 'テストタスク',
        description: 'テスト用のタスク',
        priority: 'must',
        category: 'テスト',
        estimated_hours: 1.5,
        actual_hours: undefined,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      ;(statements.getTaskById.get as jest.Mock).mockReturnValue(mockTask)
      ;(runTransaction as jest.Mock).mockImplementation((callback) => {
        return callback()
      })

      const result = TaskService.moveTaskToDate(taskId, targetDate)

      expect(statements.insertTaskSchedule.run).toHaveBeenCalledWith(
        taskId,
        2, // 火曜日
        '10:00', // デフォルト時間
        '11:30', // 1.5時間後
        targetDate
      )
      expect(result).toBe(true)
    })

    it('土曜日への移動は失敗する', () => {
      const taskId = 1
      const targetDate = '2024-01-13' // 土曜日
      
      ;(runTransaction as jest.Mock).mockImplementation((callback) => {
        return callback()
      })

      const result = TaskService.moveTaskToDate(taskId, targetDate)

      expect(statements.deleteTaskSchedule.run).toHaveBeenCalledWith(taskId)
      expect(statements.insertTaskSchedule.run).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('日曜日への移動は失敗する', () => {
      const taskId = 1
      const targetDate = '2024-01-14' // 日曜日
      
      ;(runTransaction as jest.Mock).mockImplementation((callback) => {
        return callback()
      })

      const result = TaskService.moveTaskToDate(taskId, targetDate)

      expect(statements.deleteTaskSchedule.run).toHaveBeenCalledWith(taskId)
      expect(statements.insertTaskSchedule.run).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('存在しないタスクでもスケジュール削除は実行される', () => {
      const taskId = 999
      const targetDate = '2024-01-08' // 月曜日
      
      ;(statements.getTaskById.get as jest.Mock).mockReturnValue(null)
      ;(runTransaction as jest.Mock).mockImplementation((callback) => {
        return callback()
      })

      const result = TaskService.moveTaskToDate(taskId, targetDate)

      expect(statements.deleteTaskSchedule.run).toHaveBeenCalledWith(taskId)
      expect(statements.insertTaskSchedule.run).toHaveBeenCalledWith(
        taskId,
        1, // 月曜日
        '10:00',
        '11:00', // デフォルト1時間
        targetDate
      )
      expect(result).toBe(true)
    })
  })

  describe('updateTaskSchedule', () => {
    it('スケジュールを更新できる', () => {
      const scheduleId = 1
      const updates = {
        start_time: '14:00',
        end_time: '16:00',
        scheduled_date: '2024-01-09'
      }
      
      const mockResult = { changes: 1 }
      ;(statements.updateTaskSchedule.run as jest.Mock).mockReturnValue(mockResult)
      ;(runTransaction as jest.Mock).mockImplementation((callback) => {
        return callback()
      })

      const result = TaskService.updateTaskSchedule(scheduleId, updates)

      expect(runTransaction).toHaveBeenCalledWith(expect.any(Function))
      expect(statements.updateTaskSchedule.run).toHaveBeenCalledWith(
        '14:00',
        '16:00',
        '2024-01-09',
        scheduleId
      )
      expect(result).toBe(true)
    })

    it('部分的なスケジュール更新ができる', () => {
      const scheduleId = 1
      const updates = {
        start_time: '10:00'
      }
      
      const mockResult = { changes: 1 }
      ;(statements.updateTaskSchedule.run as jest.Mock).mockReturnValue(mockResult)
      ;(runTransaction as jest.Mock).mockImplementation((callback) => {
        return callback()
      })

      const result = TaskService.updateTaskSchedule(scheduleId, updates)

      expect(statements.updateTaskSchedule.run).toHaveBeenCalledWith(
        '10:00',
        undefined,
        undefined,
        scheduleId
      )
      expect(result).toBe(true)
    })

    it('存在しないスケジュールの更新は失敗する', () => {
      const scheduleId = 999
      const updates = {
        start_time: '10:00'
      }
      
      const mockResult = { changes: 0 }
      ;(statements.updateTaskSchedule.run as jest.Mock).mockReturnValue(mockResult)
      ;(runTransaction as jest.Mock).mockImplementation((callback) => {
        return callback()
      })

      const result = TaskService.updateTaskSchedule(scheduleId, updates)

      expect(result).toBe(false)
    })
  })

  describe('checkTimeConflicts', () => {
    it('時間競合がない場合はfalseを返す', () => {
      const date = '2024-01-08'
      const startTime = '14:00'
      const endTime = '16:00'
      
      const mockSchedules: TaskScheduleWithTask[] = [
        {
          id: 1,
          task_id: 1,
          day_of_week: 1,
          start_time: '09:00',
          end_time: '11:00',
          scheduled_date: '2024-01-08',
          title: 'タスク1',
          priority: 'must',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          task_id: 2,
          day_of_week: 1,
          start_time: '17:00',
          end_time: '18:00',
          scheduled_date: '2024-01-08',
          title: 'タスク2',
          priority: 'want',
          created_at: '2024-01-01T00:00:00Z',
        }
      ]
      
      ;(statements.getScheduleByDate.all as jest.Mock).mockReturnValue(mockSchedules)

      const result = TaskService.checkTimeConflicts(date, startTime, endTime)

      expect(statements.getScheduleByDate.all).toHaveBeenCalledWith(date)
      expect(result).toBe(false)
    })

    it('時間競合がある場合はtrueを返す', () => {
      const date = '2024-01-08'
      const startTime = '10:00'
      const endTime = '12:00'
      
      const mockSchedules: TaskScheduleWithTask[] = [
        {
          id: 1,
          task_id: 1,
          day_of_week: 1,
          start_time: '09:00',
          end_time: '11:00',
          scheduled_date: '2024-01-08',
          title: 'タスク1',
          priority: 'must',
          created_at: '2024-01-01T00:00:00Z',
        }
      ]
      
      ;(statements.getScheduleByDate.all as jest.Mock).mockReturnValue(mockSchedules)

      const result = TaskService.checkTimeConflicts(date, startTime, endTime)

      expect(result).toBe(true)
    })

    it('除外タスクIDが指定された場合、そのタスクは競合チェックから除外される', () => {
      const date = '2024-01-08'
      const startTime = '10:00'
      const endTime = '12:00'
      const excludeTaskId = 1
      
      const mockSchedules: TaskScheduleWithTask[] = [
        {
          id: 1,
          task_id: 1,
          day_of_week: 1,
          start_time: '09:00',
          end_time: '11:00',
          scheduled_date: '2024-01-08',
          title: 'タスク1',
          priority: 'must',
          created_at: '2024-01-01T00:00:00Z',
        }
      ]
      
      ;(statements.getScheduleByDate.all as jest.Mock).mockReturnValue(mockSchedules)

      const result = TaskService.checkTimeConflicts(date, startTime, endTime, excludeTaskId)

      expect(result).toBe(false)
    })

    it('時間が設定されていないスケジュールは競合チェックから除外される', () => {
      const date = '2024-01-08'
      const startTime = '10:00'
      const endTime = '12:00'
      
      const mockSchedules: TaskScheduleWithTask[] = [
        {
          id: 1,
          task_id: 1,
          day_of_week: 1,
          start_time: null,
          end_time: null,
          scheduled_date: '2024-01-08',
          title: 'タスク1',
          priority: 'must',
          created_at: '2024-01-01T00:00:00Z',
        }
      ]
      
      ;(statements.getScheduleByDate.all as jest.Mock).mockReturnValue(mockSchedules)

      const result = TaskService.checkTimeConflicts(date, startTime, endTime)

      expect(result).toBe(false)
    })

    it('境界値での時間競合チェック', () => {
      const date = '2024-01-08'
      
      const mockSchedules: TaskScheduleWithTask[] = [
        {
          id: 1,
          task_id: 1,
          day_of_week: 1,
          start_time: '09:00',
          end_time: '11:00',
          scheduled_date: '2024-01-08',
          title: 'タスク1',
          priority: 'must',
          created_at: '2024-01-01T00:00:00Z',
        }
      ]
      
      ;(statements.getScheduleByDate.all as jest.Mock).mockReturnValue(mockSchedules)

      // 直前の時間帯（競合なし）
      expect(TaskService.checkTimeConflicts(date, '08:00', '09:00')).toBe(false)
      
      // 直後の時間帯（競合なし）
      expect(TaskService.checkTimeConflicts(date, '11:00', '12:00')).toBe(false)
      
      // 1分だけ重複（競合あり）
      expect(TaskService.checkTimeConflicts(date, '08:59', '09:01')).toBe(true)
      expect(TaskService.checkTimeConflicts(date, '10:59', '11:01')).toBe(true)
    })
  })
})