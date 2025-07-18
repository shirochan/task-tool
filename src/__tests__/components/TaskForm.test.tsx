/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
    expect(screen.getByText('AIチャットでタスクを詳しく相談して、フォームに自動反映できます')).toBeInTheDocument()
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
          status: 'pending',
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
          status: 'pending',
        }),
      })
      expect(mockOnTaskUpdated).toHaveBeenCalledWith(mockResponse)
    })
  })

  it('フォームに反映ボタンが正常に動作する', async () => {
    const user = userEvent.setup()
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        estimated_hours: 3.5, 
        hours: 3.5, 
        reasoning: 'プレゼンテーション資料作成には調査と作成が必要', 
        questions: ['どのような形式の資料ですか？', '参考資料はありますか？'] 
      }),
    })

    render(<TaskForm {...defaultProps} />)

    // AI相談タブに切り替え
    await user.click(screen.getByRole('tab', { name: /AI相談/ }))

    // チャットでメッセージを送信
    const chatInput = screen.getByPlaceholderText(/タスクについて質問してください/)
    await user.type(chatInput, 'プレゼンテーション資料作成')
    await user.click(screen.getByRole('button', { name: /送信|メッセージを送信/ }))

    // 見積もり結果が表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText(/見積もり結果: 3.5時間/)).toBeInTheDocument()
    })

    // フォームに反映ボタンをクリック
    await user.click(screen.getByRole('button', { name: /フォームに反映/ }))

    // タスクフォームタブに切り替わることを確認
    await waitFor(() => {
      expect(screen.getByRole('tabpanel', { name: /タスクフォーム/ })).toBeVisible()
    })

    // 見積もり時間がフォームに入力されることを確認
    expect(screen.getByDisplayValue('3.5')).toBeInTheDocument()
    
    // タイトルがチャットメッセージから自動入力されることを確認
    expect(screen.getByDisplayValue('プレゼンテーション資料作成')).toBeInTheDocument()
  })

  it('タイトルが既に入力されている場合は上書きしない', async () => {
    const user = userEvent.setup()
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        estimated_hours: 2, 
        hours: 2, 
        reasoning: 'テスト用の理由', 
        questions: [] 
      }),
    })

    render(<TaskForm {...defaultProps} />)

    // 先にタイトルを入力
    const titleInput = screen.getByLabelText(/タイトル/)
    await user.type(titleInput, '既存のタイトル')

    // AI相談タブに切り替え
    await user.click(screen.getByRole('tab', { name: /AI相談/ }))

    // チャットでメッセージを送信
    const chatInput = screen.getByPlaceholderText(/タスクについて質問してください/)
    await user.type(chatInput, '新しいタスク内容')
    await user.click(screen.getByRole('button', { name: /送信|メッセージを送信/ }))

    // 見積もり結果が表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText(/見積もり結果: 2時間/)).toBeInTheDocument()
    })

    // フォームに反映ボタンをクリック
    await user.click(screen.getByRole('button', { name: /フォームに反映/ }))

    // タスクフォームタブに切り替わることを確認
    await waitFor(() => {
      expect(screen.getByRole('tabpanel', { name: /タスクフォーム/ })).toBeVisible()
    })

    // 既存のタイトルが保持されることを確認
    expect(screen.getByDisplayValue('既存のタイトル')).toBeInTheDocument()
  })

  it('長いメッセージがタイトルに設定される場合は50文字で切り詰める', async () => {
    const user = userEvent.setup()
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        estimated_hours: 1, 
        hours: 1, 
        reasoning: 'テスト用の理由', 
        questions: [] 
      }),
    })

    render(<TaskForm {...defaultProps} />)

    // AI相談タブに切り替え
    await user.click(screen.getByRole('tab', { name: /AI相談/ }))

    // 長いメッセージを送信
    const longMessage = 'これは非常に長いメッセージです。タイトルとして使用されるときは50文字で切り詰められるはずです。この部分は切り詰められるでしょう。'
    const chatInput = screen.getByPlaceholderText(/タスクについて質問してください/)
    await user.type(chatInput, longMessage)
    await user.click(screen.getByRole('button', { name: /送信|メッセージを送信/ }))

    // 見積もり結果が表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText(/見積もり結果: 1時間/)).toBeInTheDocument()
    })

    // フォームに反映ボタンをクリック
    await user.click(screen.getByRole('button', { name: /フォームに反映/ }))

    // タスクフォームタブに切り替わることを確認
    await waitFor(() => {
      expect(screen.getByRole('tabpanel', { name: /タスクフォーム/ })).toBeVisible()
    })

    // 50文字で切り詰められたタイトルが設定されることを確認
    const expectedTitle = longMessage.substring(0, 50)
    expect(screen.getByDisplayValue(expectedTitle)).toBeInTheDocument()
  })

  it('日本語入力時のIME確定でEnterが押されても送信されない', async () => {
    const user = userEvent.setup()
    
    render(<TaskForm {...defaultProps} />)

    // AI相談タブに切り替え
    await user.click(screen.getByRole('tab', { name: /AI相談/ }))

    const chatInput = screen.getByPlaceholderText(/タスクについて質問してください/)
    
    // IME入力開始をシミュレート
    chatInput.focus()
    fireEvent.compositionStart(chatInput)
    
    // 日本語入力中にEnterキーを押す（IME確定）
    fireEvent.keyDown(chatInput, { key: 'Enter' })
    
    // IME入力終了をシミュレート
    fireEvent.compositionEnd(chatInput)
    
    // メッセージが送信されていないことを確認
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('IME入力中でない場合はEnterキーで送信される', async () => {
    const user = userEvent.setup()
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        estimated_hours: 2, 
        hours: 2, 
        reasoning: 'テスト用の理由', 
        questions: [] 
      }),
    })
    
    render(<TaskForm {...defaultProps} />)

    // AI相談タブに切り替え
    await user.click(screen.getByRole('tab', { name: /AI相談/ }))

    const chatInput = screen.getByPlaceholderText(/タスクについて質問してください/)
    
    // 通常の入力でEnterキーを押す
    await user.type(chatInput, 'テストメッセージ')
    fireEvent.keyDown(chatInput, { key: 'Enter' })
    
    // メッセージが送信されることを確認
    expect(global.fetch).toHaveBeenCalledWith('/api/estimate', expect.any(Object))
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




  it('AIチャット機能が正常に動作する', async () => {
    const user = userEvent.setup()
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        estimated_hours: 2, 
        hours: 2, 
        reasoning: 'テスト用の見積もり理由', 
        questions: ['テスト質問1', 'テスト質問2'] 
      }),
    })

    render(<TaskForm {...defaultProps} />)

    // AI相談タブに切り替え
    await user.click(screen.getByRole('tab', { name: /AI相談/ }))

    // チャット入力とボタンが表示されることを確認
    const chatInput = screen.getByPlaceholderText(/タスクについて質問してください/)
    const sendButton = screen.getByRole('button', { name: /送信|メッセージを送信/ })

    expect(chatInput).toBeInTheDocument()
    expect(sendButton).toBeInTheDocument()

    // メッセージを入力して送信
    await user.type(chatInput, 'プレゼンテーション資料作成')
    await user.click(sendButton)

    // 見積もり完了まで待機
    await waitFor(() => {
      expect(screen.getByText(/見積もり結果: 2時間/)).toBeInTheDocument()
    })
  })

  it('履歴タブが正常に表示される', async () => {
    const user = userEvent.setup()
    render(<TaskForm {...defaultProps} />)

    // 履歴タブをクリック
    await user.click(screen.getByRole('tab', { name: /履歴/ }))

    // 履歴タブの内容が表示されることを確認
    expect(screen.getByText('チャット履歴')).toBeInTheDocument()
    expect(screen.getByText('過去のAI相談履歴を確認できます。')).toBeInTheDocument()
    expect(screen.getByText('セッション一覧')).toBeInTheDocument()
    expect(screen.getByText('メッセージ履歴')).toBeInTheDocument()
  })
})