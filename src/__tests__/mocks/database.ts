import { Task, TaskInput } from '@/lib/types'

// テスト用のインメモリデータベース
class MockDatabase {
  private tasks: Task[] = []
  private taskIdCounter = 1

  // タスクの初期データをセット
  seed(tasks: Task[] = []) {
    this.tasks = [...tasks]
    this.taskIdCounter = Math.max(...tasks.map(t => t.id), 0) + 1
  }

  // 全てのタスクを取得
  getAllTasks(): Task[] {
    return [...this.tasks]
  }

  // IDでタスクを取得
  getTaskById(id: number): Task | undefined {
    return this.tasks.find(t => t.id === id)
  }

  // タスクを作成
  createTask(input: TaskInput): Task {
    const task: Task = {
      id: this.taskIdCounter++,
      ...input,
      actual_hours: undefined,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    this.tasks.push(task)
    return task
  }

  // タスクを更新
  updateTask(id: number, updates: Partial<TaskInput>): Task | null {
    const index = this.tasks.findIndex(t => t.id === id)
    if (index === -1) return null

    this.tasks[index] = {
      ...this.tasks[index],
      ...updates,
      updated_at: new Date().toISOString(),
    }
    return this.tasks[index]
  }

  // タスクを削除
  deleteTask(id: number): boolean {
    const index = this.tasks.findIndex(t => t.id === id)
    if (index === -1) return false

    this.tasks.splice(index, 1)
    return true
  }

  // データベースをクリア
  clear() {
    this.tasks = []
    this.taskIdCounter = 1
  }
}

export const mockDatabase = new MockDatabase()

// デフォルトのテストデータ
export const defaultTestTasks: Task[] = [
  {
    id: 1,
    title: 'プレゼンテーション資料作成',
    description: '来週の会議用プレゼンテーション資料を作成する',
    priority: 'must',
    category: '仕事',
    estimated_hours: 4,
    actual_hours: undefined,
    status: 'pending',
    created_at: '2024-01-01T09:00:00Z',
    updated_at: '2024-01-01T09:00:00Z',
  },
  {
    id: 2,
    title: 'Next.js学習',
    description: 'Next.js 15の新機能について学習する',
    priority: 'want',
    category: '勉強',
    estimated_hours: 3,
    actual_hours: undefined,
    status: 'pending',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  },
]

// Jest requires at least one test per file
it('should export mock database utilities', () => {
  expect(mockDatabase).toBeDefined()
  expect(defaultTestTasks).toHaveLength(2)
})
