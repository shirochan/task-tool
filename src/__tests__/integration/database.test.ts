/**
 * データベース統合テスト
 * 実際のSQLiteデータベースを使用してテストを実行
 */

import { TaskService } from '@/lib/services/taskService'
import { Task, TaskInput } from '@/lib/types'
import fs from 'fs'
import path from 'path'

// テスト用データベースパス
const TEST_DB_PATH = path.join(process.cwd(), 'data', 'test.db')

describe.skip('Database Integration Tests', () => {
  beforeEach(() => {
    // データディレクトリを作成
    const dataDir = path.dirname(TEST_DB_PATH)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    // テスト用データベースが存在する場合は削除
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
    
    // 環境変数でテスト用データベースを指定
    process.env.DB_PATH = TEST_DB_PATH
  })

  afterEach(() => {
    // テスト後にテスト用データベースを削除
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
    delete process.env.DB_PATH
  })

  it('データベース初期化が正常に動作する', () => {
    // 初回アクセスでデータベースが作成される
    const tasks = TaskService.getAllTasks()
    expect(Array.isArray(tasks)).toBe(true)
    expect(tasks).toHaveLength(0)
    
    // データベースファイルが作成されている
    expect(fs.existsSync(TEST_DB_PATH)).toBe(true)
  })

  it('タスクのCRUD操作が正常に動作する', () => {
    const taskInput: TaskInput = {
      title: '統合テストタスク',
      description: 'データベース統合テスト用のタスク',
      priority: 'must',
      category: 'テスト',
      estimated_hours: 2.5,
    }

    // CREATE: タスク作成
    const createdTask = TaskService.createTask(taskInput)
    expect(createdTask).toMatchObject({
      id: expect.any(Number),
      title: taskInput.title,
      description: taskInput.description,
      priority: taskInput.priority,
      category: taskInput.category,
      estimated_hours: taskInput.estimated_hours,
      status: 'pending',
      created_at: expect.any(String),
      updated_at: expect.any(String),
    })

    // READ: タスク取得
    const taskById = TaskService.getTaskById(createdTask.id)
    expect(taskById).toEqual(createdTask)

    const allTasks = TaskService.getAllTasks()
    expect(allTasks).toHaveLength(1)
    expect(allTasks[0]).toEqual(createdTask)

    // UPDATE: タスク更新
    const updateInput: TaskInput = {
      title: '更新された統合テストタスク',
      description: '更新されたタスクの説明',
      priority: 'want',
      category: '更新テスト',
      estimated_hours: 3.0,
    }

    const updatedTask = TaskService.updateTask(createdTask.id, updateInput)
    expect(updatedTask).toMatchObject({
      id: createdTask.id,
      title: updateInput.title,
      description: updateInput.description,
      priority: updateInput.priority,
      category: updateInput.category,
      estimated_hours: updateInput.estimated_hours,
      status: 'pending',
      created_at: createdTask.created_at,
      updated_at: expect.any(String),
    })

    // 更新後の取得確認
    const updatedTaskById = TaskService.getTaskById(createdTask.id)
    expect(updatedTaskById).toEqual(updatedTask)

    // DELETE: タスク削除
    const deleteResult = TaskService.deleteTask(createdTask.id)
    expect(deleteResult).toBe(true)

    // 削除確認
    const deletedTask = TaskService.getTaskById(createdTask.id)
    expect(deletedTask).toBeNull()

    const tasksAfterDelete = TaskService.getAllTasks()
    expect(tasksAfterDelete).toHaveLength(0)
  })

  it('複数タスクの作成と取得が正常に動作する', () => {
    const tasks: TaskInput[] = [
      {
        title: 'タスク1',
        description: '最初のタスク',
        priority: 'must',
        category: 'カテゴリA',
        estimated_hours: 1.0,
      },
      {
        title: 'タスク2',
        description: '2番目のタスク',
        priority: 'want',
        category: 'カテゴリB',
        estimated_hours: 2.0,
      },
      {
        title: 'タスク3',
        description: '3番目のタスク',
        priority: 'must',
        category: 'カテゴリA',
        estimated_hours: 1.5,
      },
    ]

    // 複数タスクを作成
    const createdTasks: Task[] = []
    for (const taskInput of tasks) {
      const createdTask = TaskService.createTask(taskInput)
      createdTasks.push(createdTask)
    }

    // 全タスク取得
    const allTasks = TaskService.getAllTasks()
    expect(allTasks).toHaveLength(3)

    // IDが連番になっている
    expect(allTasks[0].id).toBe(1)
    expect(allTasks[1].id).toBe(2)
    expect(allTasks[2].id).toBe(3)

    // 各タスクの内容確認
    for (let i = 0; i < tasks.length; i++) {
      expect(allTasks[i]).toMatchObject({
        title: tasks[i].title,
        description: tasks[i].description,
        priority: tasks[i].priority,
        category: tasks[i].category,
        estimated_hours: tasks[i].estimated_hours,
      })
    }
  })

  it('不正なIDでの操作が適切に処理される', () => {
    // 存在しないIDでの取得
    const nonExistentTask = TaskService.getTaskById(999)
    expect(nonExistentTask).toBeNull()

    // 存在しないIDでの更新
    const updateInput: TaskInput = {
      title: '存在しないタスク',
      priority: 'must',
    }
    
    expect(() => {
      TaskService.updateTask(999, updateInput)
    }).toThrow()

    // 存在しないIDでの削除
    const deleteResult = TaskService.deleteTask(999)
    expect(deleteResult).toBe(false)
  })

  it('データベース永続化が正常に動作する', () => {
    const taskInput: TaskInput = {
      title: '永続化テストタスク',
      description: 'データベース永続化テスト',
      priority: 'must',
      category: 'テスト',
      estimated_hours: 1.0,
    }

    // タスク作成
    const createdTask = TaskService.createTask(taskInput)
    expect(createdTask.id).toBe(1)

    // 新しいTaskServiceインスタンスで同じデータベースにアクセス
    const allTasks = TaskService.getAllTasks()
    expect(allTasks).toHaveLength(1)
    expect(allTasks[0]).toEqual(createdTask)
  })

  it('タスクステータスの更新が正常に動作する', () => {
    const taskInput: TaskInput = {
      title: 'ステータステストタスク',
      description: 'ステータス更新テスト',
      priority: 'must',
      category: 'テスト',
      estimated_hours: 1.0,
    }

    // タスク作成（初期ステータスはpending）
    const createdTask = TaskService.createTask(taskInput)
    expect(createdTask.status).toBe('pending')

    // タスクの内容を更新（ステータスは変更されない）
    const updatedTask = TaskService.updateTask(createdTask.id, {
      ...taskInput,
      title: '更新されたタスク',
    })
    
    // 取得して確認
    const task = TaskService.getTaskById(createdTask.id)
    expect(task).not.toBeNull()
    expect(task!.title).toBe('更新されたタスク')
    expect(task!.status).toBe('pending') // ステータスは変更されない
  })

  it('複数のタスクカテゴリでの操作テスト', () => {
    const categories = ['仕事', '勉強', '趣味', 'その他']
    const priorities: ('must' | 'want')[] = ['must', 'want']
    
    const createdTasks: Task[] = []
    
    // 各カテゴリ・優先度でタスクを作成
    categories.forEach((category, categoryIndex) => {
      priorities.forEach((priority, priorityIndex) => {
        const taskInput: TaskInput = {
          title: `${category}のタスク${priorityIndex + 1}`,
          description: `${category}での${priority}タスク`,
          priority,
          category,
          estimated_hours: (categoryIndex + 1) * (priorityIndex + 1),
        }
        
        const task = TaskService.createTask(taskInput)
        createdTasks.push(task)
      })
    })
    
    // 全タスク取得
    const allTasks = TaskService.getAllTasks()
    expect(allTasks).toHaveLength(8) // 4カテゴリ × 2優先度
    
    // カテゴリ別の確認
    categories.forEach(category => {
      const categoryTasks = allTasks.filter(task => task.category === category)
      expect(categoryTasks).toHaveLength(2)
    })
    
    // 優先度別の確認
    priorities.forEach(priority => {
      const priorityTasks = allTasks.filter(task => task.priority === priority)
      expect(priorityTasks).toHaveLength(4)
    })
  })

  it('大量データのパフォーマンステスト', () => {
    const startTime = Date.now()

    // 100個のタスクを作成
    const tasks: Task[] = []
    for (let i = 1; i <= 100; i++) {
      const taskInput: TaskInput = {
        title: `パフォーマンステストタスク${i}`,
        description: `${i}番目のテストタスク`,
        priority: i % 2 === 0 ? 'must' : 'want',
        category: `カテゴリ${i % 5}`,
        estimated_hours: Math.floor(Math.random() * 10) + 1,
      }
      const task = TaskService.createTask(taskInput)
      tasks.push(task)
    }

    const createTime = Date.now() - startTime

    // 全タスク取得
    const retrieveStartTime = Date.now()
    const allTasks = TaskService.getAllTasks()
    const retrieveTime = Date.now() - retrieveStartTime

    expect(allTasks).toHaveLength(100)
    expect(createTime).toBeLessThan(5000) // 5秒以内
    expect(retrieveTime).toBeLessThan(1000) // 1秒以内

    // いくつかのタスクを更新
    const updateStartTime = Date.now()
    for (let i = 0; i < 10; i++) {
      TaskService.updateTask(tasks[i].id, {
        title: `更新されたタスク${i}`,
        priority: 'must',
      })
    }
    const updateTime = Date.now() - updateStartTime

    expect(updateTime).toBeLessThan(1000) // 1秒以内

    // いくつかのタスクを削除
    const deleteStartTime = Date.now()
    for (let i = 0; i < 10; i++) {
      TaskService.deleteTask(tasks[i].id)
    }
    const deleteTime = Date.now() - deleteStartTime

    expect(deleteTime).toBeLessThan(1000) // 1秒以内

    // 最終確認
    const finalTasks = TaskService.getAllTasks()
    expect(finalTasks).toHaveLength(90)
  })
})