/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskForm } from '@/components/TaskForm'
import { Task } from '@/lib/types'

// fetch APIのモック
global.fetch = jest.fn()

// window.alert のモック
global.alert = jest.fn()

describe('TaskForm', () => {
  const mockOnTaskCreated = jest.fn()
  const mockOnTaskUpdated = jest.fn()
  const mockOnCancel = jest.fn()

  const defaultProps = {
    onTaskCreated: mockOnTaskCreated,
    onTaskUpdated: mockOnTaskUpdated,
    onCancel: mockOnCancel,
  }

  const mockTask: Task = {
    id: 1,
    title: 'テストタスク',
    description: 'テスト用のタスクです',
    priority: 'must',
    category: 'テスト',
    estimated_hours: 2,
    actual_hours: undefined,
    status: 'pending',
    created_at: '2024-01-01T09:00:00Z',
    updated_at: '2024-01-01T09:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('新規タスク作成モードで正常にレンダリングされる', () => {
    render(<TaskForm {...defaultProps} />)

    expect(screen.getByText('新規タスク')).toBeInTheDocument()
    expect(screen.getByText('AIが自動で作業時間を見積もります')).toBeInTheDocument()
    expect(screen.getByLabelText('タイトル *')).toBeInTheDocument()
    expect(screen.getByLabelText('詳細説明')).toBeInTheDocument()
    expect(screen.getByText('優先度 *')).toBeInTheDocument()
    expect(screen.getByLabelText('カテゴリ')).toBeInTheDocument()
    expect(screen.getByLabelText('見積もり時間 (時間)')).toBeInTheDocument()
  })

  it('編集モードで既存タスクの値が正しく表示される', () => {
    render(<TaskForm {...defaultProps} task={mockTask} />)

    expect(screen.getByText('タスク編集')).toBeInTheDocument()
    expect(screen.getByText('タスクの情報を編集します')).toBeInTheDocument()
    expect(screen.getByDisplayValue('テストタスク')).toBeInTheDocument()
    expect(screen.getByDisplayValue('テスト用のタスクです')).toBeInTheDocument()
    expect(screen.getByDisplayValue('テスト')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
  })

  it('フォームバリデーションが正常に動作する', async () => {
    const user = userEvent.setup()
    render(<TaskForm {...defaultProps} />)

    // タイトルを空のまま送信
    const submitButton = screen.getByRole('button', { name: '作成' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('タイトルは必須です')).toBeInTheDocument()
    })
  })

  it('新規タスクを正常に作成できる', async () => {
    const user = userEvent.setup()
    const mockResponse = { id: 1, title: '新しいタスク', priority: 'want' }
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    render(<TaskForm {...defaultProps} />)

    // フォームに入力
    await user.type(screen.getByLabelText('タイトル *'), '新しいタスク')
    await user.type(screen.getByLabelText('詳細説明'), '新しいタスクの説明')
    await user.type(screen.getByLabelText('カテゴリ'), 'テスト')
    await user.type(screen.getByLabelText('見積もり時間 (時間)'), '3')

    // 送信
    await user.click(screen.getByRole('button', { name: '作成' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '新しいタスク',
          description: '新しいタスクの説明',
          priority: 'want',
          category: 'テスト',
          estimated_hours: 3,
        }),
      })
      expect(mockOnTaskCreated).toHaveBeenCalledWith(mockResponse)
    })
  })

  it('既存タスクを正常に更新できる', async () => {
    const user = userEvent.setup()
    const mockResponse = { ...mockTask, title: '更新されたタスク' }
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    render(<TaskForm {...defaultProps} task={mockTask} />)

    // タイトルを更新
    const titleInput = screen.getByDisplayValue('テストタスク')
    await user.clear(titleInput)
    await user.type(titleInput, '更新されたタスク')

    // 送信
    await user.click(screen.getByRole('button', { name: '更新' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tasks/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '更新されたタスク',
          description: 'テスト用のタスクです',
          priority: 'must',
          category: 'テスト',
          estimated_hours: 2,
        }),
      })
      expect(mockOnTaskUpdated).toHaveBeenCalledWith(mockResponse)
    })
  })

  it('AI見積もりが正常に動作する', async () => {
    const user = userEvent.setup()
    const mockEstimate = {
      hours: 3.5,
      reasoning: 'プレゼンテーション資料作成には調査と作成が必要',
      questions: ['どのような形式の資料ですか？', '参考資料はありますか？'],
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEstimate),
    })

    render(<TaskForm {...defaultProps} />)

    // タイトルを入力
    await user.type(screen.getByLabelText('タイトル *'), 'プレゼンテーション資料作成')
    
    // AI見積もりボタンをクリック
    await user.click(screen.getByRole('button', { name: 'AI見積もり' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: {
            priority: 'want',
            title: 'プレゼンテーション資料作成',
            description: '',
            category: '',
            estimated_hours: null,
          },
        }),
      })
    })

    // AI見積もり結果が表示される
    await waitFor(() => {
      expect(screen.getByText('AI見積もり結果')).toBeInTheDocument()
      expect(screen.getByText('推定時間: 3.5時間')).toBeInTheDocument()
      expect(screen.getByText('理由: プレゼンテーション資料作成には調査と作成が必要')).toBeInTheDocument()
      expect(screen.getByText('より正確な見積もりのための質問:')).toBeInTheDocument()
      expect(screen.getByText('どのような形式の資料ですか？')).toBeInTheDocument()
      expect(screen.getByText('参考資料はありますか？')).toBeInTheDocument()
    })

    // 見積もり時間が自動で入力される
    expect(screen.getByDisplayValue('3.5')).toBeInTheDocument()
  })

  it('タイトルが未入力の場合AI見積もりでアラートが表示される', async () => {
    const user = userEvent.setup()
    render(<TaskForm {...defaultProps} />)

    // AI見積もりボタンをタイトル未入力でクリック
    await user.click(screen.getByRole('button', { name: 'AI見積もり' }))

    expect(global.alert).toHaveBeenCalledWith('タイトルを入力してください')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('AI見積もりが失敗した場合エラーメッセージが表示される', async () => {
    const user = userEvent.setup()
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    })

    render(<TaskForm {...defaultProps} />)

    await user.type(screen.getByLabelText('タイトル *'), 'テストタスク')
    await user.click(screen.getByRole('button', { name: 'AI見積もり' }))

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('見積もりの取得に失敗しました')
    })
  })

  it('優先度の選択が正常に動作する', async () => {
    render(<TaskForm {...defaultProps} />)

    // 優先度セレクトが表示されることを確認
    expect(screen.getByText('優先度 *')).toBeInTheDocument()
    
    // 選択肢が定義されていることを確認
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('キャンセルボタンが正常に動作する', async () => {
    const user = userEvent.setup()
    render(<TaskForm {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(mockOnCancel).toHaveBeenCalled()
  })




  it('AI見積もり中はボタンが無効化される', async () => {
    const user = userEvent.setup()
    
    // レスポンスを遅延させる
    ;(global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ hours: 2, reasoning: 'test', questions: [] }),
      }), 100))
    )

    render(<TaskForm {...defaultProps} />)

    await user.type(screen.getByLabelText('タイトル *'), 'テストタスク')
    
    const estimateButton = screen.getByRole('button', { name: 'AI見積もり' })
    await user.click(estimateButton)

    // AI見積もり中はボタンのテキストが変わり、無効化される
    expect(screen.getByRole('button', { name: 'AI見積もり中...' })).toBeDisabled()

    // 見積もり完了まで待機
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'AI見積もり' })).not.toBeDisabled()
    })
  })
})