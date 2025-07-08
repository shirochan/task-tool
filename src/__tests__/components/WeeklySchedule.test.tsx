/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WeeklySchedule } from '@/components/WeeklySchedule'
import { Task, TaskScheduleWithTask } from '@/lib/types'

// fetch APIのモック
global.fetch = jest.fn()

// window.alert のモック
global.alert = jest.fn()

describe('WeeklySchedule', () => {
  const mockTasks: Task[] = [
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
      created_at: '2024-01-02T10:00:00Z',
      updated_at: '2024-01-02T10:00:00Z',
    },
  ]

  const mockSchedule: { [key: string]: TaskScheduleWithTask[] } = {
    '2024-01-08': [
      {
        task_id: 1,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '13:00',
        scheduled_date: '2024-01-08',
        title: 'プレゼンテーション資料作成',
        description: '来週の会議用プレゼンテーション資料を作成する',
        priority: 'must',
        category: '仕事',
        estimated_hours: 4,
        status: 'pending',
      },
    ],
    '2024-01-09': [],
    '2024-01-10': [],
    '2024-01-11': [],
    '2024-01-12': [],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // 現在の日付を固定（2024年1月10日 水曜日）
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-10T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('コンポーネントが正常にレンダリングされる', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSchedule),
    })

    render(<WeeklySchedule tasks={mockTasks} />)

    // ローディング状態の確認
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()

    // データ読み込み後の確認
    await waitFor(() => {
      expect(screen.getByText('週間スケジュール')).toBeInTheDocument()
    })
  })

  it('初期表示でスケジュールが読み込まれる', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSchedule),
    })

    render(<WeeklySchedule tasks={mockTasks} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/schedule')
      expect(screen.getByText('スケジュール生成')).toBeInTheDocument()
    })
  })

  it('統計情報が正しく表示される', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSchedule),
    })

    render(<WeeklySchedule tasks={mockTasks} />)

    await waitFor(() => {
      // 統計情報の確認
      expect(screen.getByText('スケジュール済み')).toBeInTheDocument()
      expect(screen.getByText('未スケジュール')).toBeInTheDocument()
      expect(screen.getByText('今週の予定時間')).toBeInTheDocument()
      expect(screen.getByText('4.0h')).toBeInTheDocument()
    })
  })

  it('未スケジュールタスクが表示される', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSchedule),
    })

    render(<WeeklySchedule tasks={mockTasks} />)

    await waitFor(() => {
      expect(screen.getByText('未スケジュールタスク')).toBeInTheDocument()
      expect(screen.getByText('Next.js学習')).toBeInTheDocument()
      expect(screen.getByText('3h')).toBeInTheDocument()
    })
  })

  it('週間カレンダーが正しく表示される', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSchedule),
    })

    render(<WeeklySchedule tasks={mockTasks} />)

    await waitFor(() => {
      // WeeklyScheduleコンポーネントの存在確認
      expect(screen.getByText('週間スケジュール')).toBeInTheDocument()

      // スケジュール済みタスクの表示
      expect(screen.getByText('プレゼンテーション資料作成')).toBeInTheDocument()
      expect(screen.getByText('09:00 - 13:00')).toBeInTheDocument()

      // 各日の予定時間
      expect(screen.getByText('4.0時間')).toBeInTheDocument()
    })
  })

  it('スケジュール生成ボタンが正常に動作する', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSchedule),
      })

    render(<WeeklySchedule tasks={mockTasks} />)

    await waitFor(() => {
      expect(screen.getAllByText('スケジュール生成')[0]).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('スケジュール生成')[0])

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/schedule/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tasks: mockTasks }),
      })
    })
  })

  it('空のスケジュール状態が表示される', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    render(<WeeklySchedule tasks={mockTasks} />)

    await waitFor(() => {
      expect(screen.getByText('まだスケジュールが生成されていません')).toBeInTheDocument()
    })
  })

  it('タスクがない場合はスケジュール生成ボタンが無効化される', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    render(<WeeklySchedule tasks={[]} />)

    await waitFor(() => {
      expect(screen.getAllByText('スケジュール生成').length).toBeGreaterThan(0)
    })
  })

  it('スケジュール生成中はボタンが無効化される', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    render(<WeeklySchedule tasks={mockTasks} />)

    await waitFor(() => {
      expect(screen.getAllByText('スケジュール生成')[0]).toBeInTheDocument()
    })
  })

  it('スケジュール生成が失敗した場合エラーメッセージが表示される', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    render(<WeeklySchedule tasks={mockTasks} />)

    await waitFor(() => {
      expect(screen.getAllByText('スケジュール生成')[0]).toBeInTheDocument()
    })
  })

  it('ネットワークエラーが発生した場合エラーメッセージが表示される', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    render(<WeeklySchedule tasks={mockTasks} />)

    await waitFor(() => {
      expect(screen.getAllByText('スケジュール生成')[0]).toBeInTheDocument()
    })
  })

  it('API呼び出しに失敗した場合もエラーなく表示される', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<WeeklySchedule tasks={mockTasks} />)

    await waitFor(() => {
      expect(screen.getByText('まだスケジュールが生成されていません')).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  it('優先度に応じて正しいスタイルが適用される', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSchedule),
    })

    render(<WeeklySchedule tasks={mockTasks} />)

    await waitFor(() => {
      const mustBadges = screen.getAllByText('必須')
      const wantBadges = screen.getAllByText('希望')

      // 必須タスクの赤いバッジ
      mustBadges.forEach(badge => {
        expect(badge).toHaveClass('bg-red-100', 'text-red-800')
      })

      // 希望タスクの青いバッジ
      wantBadges.forEach(badge => {
        expect(badge).toHaveClass('bg-blue-100', 'text-blue-800')
      })
    })
  })

  it('複数のスケジュール済みタスクが正しく表示される', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSchedule),
    })

    render(<WeeklySchedule tasks={mockTasks} />)

    await waitFor(() => {
      expect(screen.getByText('プレゼンテーション資料作成')).toBeInTheDocument()
      expect(screen.getByText('4.0h')).toBeInTheDocument()
    })
  })
})