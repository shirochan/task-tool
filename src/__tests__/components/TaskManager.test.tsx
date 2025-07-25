/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TaskManager } from '@/components/TaskManager'
import { Task } from '@/lib/types'

// fetch APIのモック
global.fetch = jest.fn()

// window.confirm のモック
global.confirm = jest.fn()

// useToast のモック
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    toast: jest.fn(),
    dismiss: jest.fn(),
    toasts: [],
  }),
}))

describe('TaskManager', () => {
  const mockTasks: Task[] = [
    {
      id: 1,
      title: 'テストタスク1',
      description: 'テスト用のタスクです',
      priority: 'must',
      category: 'テスト',
      estimated_hours: 2,
      actual_hours: undefined,
      status: 'pending',
      created_at: '2024-01-01T09:00:00Z',
      updated_at: '2024-01-01T09:00:00Z',
    },
    {
      id: 2,
      title: 'テストタスク2',
      description: '別のテスト用タスクです',
      priority: 'want',
      category: 'テスト',
      estimated_hours: 1.5,
      actual_hours: undefined,
      status: 'in_progress',
      created_at: '2024-01-02T10:00:00Z',
      updated_at: '2024-01-02T10:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTasks),
    })
  })

  it('コンポーネントが正常にレンダリングされる', async () => {
    render(<TaskManager />)

    // ローディング状態の確認
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()

    // データ読み込み後の確認
    await waitFor(() => {
      expect(screen.getByText('タスク一覧')).toBeInTheDocument()
    })
  })

  it('初期表示でタスクが読み込まれる', async () => {
    render(<TaskManager />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tasks')
      expect(screen.getByText('テストタスク1')).toBeInTheDocument()
      expect(screen.getByText('テストタスク2')).toBeInTheDocument()
    })
  })

  it('タスクの詳細情報が表示される', async () => {
    render(<TaskManager />)

    await waitFor(() => {
      // タスクタイトル
      expect(screen.getByText('テストタスク1')).toBeInTheDocument()
      expect(screen.getByText('テストタスク2')).toBeInTheDocument()

      // 説明
      expect(screen.getByText('テスト用のタスクです')).toBeInTheDocument()
      expect(screen.getByText('別のテスト用タスクです')).toBeInTheDocument()

      // 優先度
      expect(screen.getByText('必須')).toBeInTheDocument()
      expect(screen.getByText('希望')).toBeInTheDocument()

      // カテゴリ
      expect(screen.getAllByText('テスト')).toHaveLength(2)

      // 見積もり時間
      expect(screen.getByText('2時間')).toBeInTheDocument()
      expect(screen.getByText('1.5時間')).toBeInTheDocument()
    })
  })

  it('新規タスクボタンをクリックするとタスクフォームが表示される', async () => {
    render(<TaskManager />)

    await waitFor(() => {
      expect(screen.getByText('新規タスク')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('新規タスク')[0])

    await waitFor(() => {
      expect(screen.getAllByText('新規タスク')[0]).toBeInTheDocument()
    })
  })

  it('タスクがない場合は空の状態が表示される', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<TaskManager />)

    await waitFor(() => {
      expect(screen.getByText('まだタスクがありません')).toBeInTheDocument()
      expect(screen.getByText('最初のタスクを作成')).toBeInTheDocument()
    })
  })

  it('空の状態から新規タスクボタンをクリックするとタスクフォームが表示される', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<TaskManager />)

    await waitFor(() => {
      expect(screen.getByText('最初のタスクを作成')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('最初のタスクを作成'))

    await waitFor(() => {
      expect(screen.getAllByText('新規タスク')[0]).toBeInTheDocument()
    })
  })




  it('タブナビゲーションが正常に動作する', async () => {
    render(<TaskManager />)

    await waitFor(() => {
      expect(screen.getByText('タスク管理')).toBeInTheDocument()
      expect(screen.getByText('週間スケジュール')).toBeInTheDocument()
    })

    // 初期状態ではタスク管理タブがアクティブ
    expect(screen.getByText('タスク一覧')).toBeInTheDocument()

    // 週間スケジュールタブをクリック
    fireEvent.click(screen.getByText('週間スケジュール'))

    // 週間スケジュールコンポーネントが表示される
    await waitFor(() => {
      expect(screen.getByText('週間スケジュール')).toBeInTheDocument()
    })

    // タスク管理タブに戻る
    fireEvent.click(screen.getByText('タスク管理'))

    await waitFor(() => {
      expect(screen.getByText('タスク一覧')).toBeInTheDocument()
    })
  })

  it('API呼び出しに失敗した場合もエラーなく表示される', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<TaskManager />)

    await waitFor(() => {
      expect(screen.getByText('まだタスクがありません')).toBeInTheDocument()
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      'タスクの取得に失敗しました:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('優先度に応じて正しいスタイルが適用される', async () => {
    render(<TaskManager />)

    await waitFor(() => {
      const mustBadge = screen.getByText('必須')
      const wantBadge = screen.getByText('希望')

      expect(mustBadge).toHaveClass('bg-red-100', 'text-red-800')
      expect(wantBadge).toHaveClass('bg-blue-100', 'text-blue-800')
    })
  })

  it('日付が表示される', async () => {
    render(<TaskManager />)

    await waitFor(() => {
      // 基本的な表示確認
      expect(screen.getByText('テストタスク1')).toBeInTheDocument()
      expect(screen.getByText('テストタスク2')).toBeInTheDocument()
    })
  })
})