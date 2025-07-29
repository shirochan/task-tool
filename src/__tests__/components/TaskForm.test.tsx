import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskForm } from '@/components/TaskForm';
import { mockTaskFormProps, mockTaskFormPropsWithTask, mockEstimateResponse } from '@/test-utils/fixtures';

// useToastをモック
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

// fetchをモック
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('TaskForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Initial Render', () => {
    it('should render new task form with default values', () => {
      render(<TaskForm {...mockTaskFormProps} />);

      expect(screen.getByText('新規タスク')).toBeInTheDocument();
      expect(screen.getByText('AIチャットでタスクを詳しく相談して、フォームに自動反映できます')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'タスクフォーム' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'AI相談' })).toBeInTheDocument();
    });

    it('should render edit task form with task data', () => {
      render(<TaskForm {...mockTaskFormPropsWithTask} />);

      expect(screen.getByText('タスク編集')).toBeInTheDocument();
      expect(screen.getByText('タスクの情報を編集します')).toBeInTheDocument();
      expect(screen.getByDisplayValue('テストタスク')).toBeInTheDocument();
      expect(screen.getByDisplayValue('テスト用のタスクです')).toBeInTheDocument();
    });

    it('should have form tab active by default', () => {
      render(<TaskForm {...mockTaskFormProps} />);

      const formTab = screen.getByRole('tab', { name: 'タスクフォーム' });
      expect(formTab).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for empty title', async () => {
      render(<TaskForm {...mockTaskFormProps} />);

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('タイトルは必須です')).toBeInTheDocument();
      });
    });

    it('should validate required fields before submission', async () => {
      render(<TaskForm {...mockTaskFormProps} />);

      const titleInput = screen.getByLabelText('タイトル *');
      await user.clear(titleInput);

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('タイトルは必須です')).toBeInTheDocument();
      });

      expect(mockTaskFormProps.onTaskCreated).not.toHaveBeenCalled();
    });

    it('should accept valid form data', async () => {
      render(<TaskForm {...mockTaskFormProps} />);

      const titleInput = screen.getByLabelText('タイトル *');
      await user.type(titleInput, '新しいタスク');

      expect(screen.getByDisplayValue('新しいタスク')).toBeInTheDocument();
      expect(screen.queryByText('タイトルは必須です')).not.toBeInTheDocument();
    });
  });

  describe('Task Creation', () => {
    it('should display create button for new tasks', () => {
      render(<TaskForm {...mockTaskFormProps} />);

      const submitButton = screen.getByRole('button', { name: '作成' });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });

    it('should handle API errors during task creation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<TaskForm {...mockTaskFormProps} />);

      const titleInput = screen.getByLabelText('タイトル *');
      await user.type(titleInput, '新しいタスク');

      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockTaskFormProps.onTaskCreated).not.toHaveBeenCalled();
      });
    });
  });

  describe('Task Editing', () => {
    it('should call onTaskUpdated when editing task successfully', async () => {
      const mockUpdatedTask = { ...mockTaskFormPropsWithTask.task, title: '更新されたタスク' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedTask,
      });

      render(<TaskForm {...mockTaskFormPropsWithTask} />);

      const titleInput = screen.getByDisplayValue('テストタスク');
      await user.clear(titleInput);
      await user.type(titleInput, '更新されたタスク');

      const submitButton = screen.getByRole('button', { name: '更新' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/tasks/1', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('更新されたタスク'),
        });
      });

      await waitFor(() => {
        expect(mockTaskFormPropsWithTask.onTaskUpdated).toHaveBeenCalledWith(mockUpdatedTask);
      });
    });

    it('should populate form with existing task data', () => {
      render(<TaskForm {...mockTaskFormPropsWithTask} />);

      expect(screen.getByDisplayValue('テストタスク')).toBeInTheDocument();
      expect(screen.getByDisplayValue('テスト用のタスクです')).toBeInTheDocument();
      expect(screen.getByDisplayValue('テスト')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2.5')).toBeInTheDocument();
    });
  });

  describe('AI Chat Integration', () => {
    it('should switch to chat tab when clicked', async () => {
      render(<TaskForm {...mockTaskFormProps} />);

      const chatTab = screen.getByRole('tab', { name: 'AI相談' });
      await user.click(chatTab);

      expect(chatTab).toHaveAttribute('data-state', 'active');
      expect(screen.getByText('タスクについて何でも聞いてください')).toBeInTheDocument();
    });

    it('should display empty chat state initially', async () => {
      render(<TaskForm {...mockTaskFormProps} />);

      const chatTab = screen.getByRole('tab', { name: 'AI相談' });
      await user.click(chatTab);

      expect(screen.getByText('タスクについて何でも聞いてください')).toBeInTheDocument();
      expect(screen.getByLabelText('AIに送信するメッセージを入力')).toBeInTheDocument();
    });

    it('should send message to AI and display response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEstimateResponse,
      });

      render(<TaskForm {...mockTaskFormProps} />);

      const chatTab = screen.getByRole('tab', { name: 'AI相談' });
      await user.click(chatTab);

      const messageInput = screen.getByLabelText('AIに送信するメッセージを入力');
      await user.type(messageInput, 'ユーザー認証システムを作りたい');

      const sendButton = screen.getByRole('button', { name: 'メッセージを送信' });
      await user.click(sendButton);

      expect(screen.getByText('ユーザー認証システムを作りたい')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/estimate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('ユーザー認証システムを作りたい'),
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/見積もり時間: 2.5時間/)).toBeInTheDocument();
      });
    });

    it('should handle AI API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'AI サービスエラー' }),
      });

      render(<TaskForm {...mockTaskFormProps} />);

      const chatTab = screen.getByRole('tab', { name: 'AI相談' });
      await user.click(chatTab);

      const messageInput = screen.getByLabelText('AIに送信するメッセージを入力');
      await user.type(messageInput, 'テストメッセージ');

      const sendButton = screen.getByRole('button', { name: 'メッセージを送信' });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/申し訳ありませんが、見積もりの取得に失敗しました/)).toBeInTheDocument();
      });
    });

    it('should disable send button when message is empty', async () => {
      render(<TaskForm {...mockTaskFormProps} />);

      const chatTab = screen.getByRole('tab', { name: 'AI相談' });
      await user.click(chatTab);

      const sendButton = screen.getByRole('button', { name: 'メッセージを送信' });
      expect(sendButton).toBeDisabled();

      const messageInput = screen.getByLabelText('AIに送信するメッセージを入力');
      await user.type(messageInput, 'テスト');

      expect(sendButton).toBeEnabled();

      await user.clear(messageInput);
      expect(sendButton).toBeDisabled();
    });

    it('should show loading state while estimating', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      render(<TaskForm {...mockTaskFormProps} />);

      const chatTab = screen.getByRole('tab', { name: 'AI相談' });
      await user.click(chatTab);

      const messageInput = screen.getByLabelText('AIに送信するメッセージを入力');
      await user.type(messageInput, 'テストメッセージ');

      const sendButton = screen.getByRole('button', { name: 'メッセージを送信' });
      await user.click(sendButton);

      expect(screen.getByText('考え中...')).toBeInTheDocument();
      expect(sendButton).toBeDisabled();

      resolvePromise!({
        ok: true,
        json: async () => mockEstimateResponse,
      });

      await waitFor(() => {
        expect(screen.queryByText('考え中...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Apply to Form Functionality', () => {
    it('should apply AI estimate to form when button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEstimateResponse,
      });

      render(<TaskForm {...mockTaskFormProps} />);

      // Switch to chat tab and send message
      const chatTab = screen.getByRole('tab', { name: 'AI相談' });
      await user.click(chatTab);

      const messageInput = screen.getByLabelText('AIに送信するメッセージを入力');
      await user.type(messageInput, 'ユーザー認証システム');

      const sendButton = screen.getByRole('button', { name: 'メッセージを送信' });
      await user.click(sendButton);

      // Wait for AI response
      await waitFor(() => {
        expect(screen.getByText(/見積もり時間: 2.5時間/)).toBeInTheDocument();
      });

      // Apply to form
      const applyButton = screen.getByRole('button', { name: 'フォームに反映' });
      await user.click(applyButton);

      // Check if form tab is active and values are applied
      const formTab = screen.getByRole('tab', { name: 'タスクフォーム' });
      expect(formTab).toHaveAttribute('data-state', 'active');

      await waitFor(() => {
        expect(screen.getByDisplayValue('2.5')).toBeInTheDocument();
        expect(screen.getByDisplayValue('ユーザー認証システム')).toBeInTheDocument();
      });
    });

    it('should not overwrite existing form title when applying estimate', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEstimateResponse,
      });

      render(<TaskForm {...mockTaskFormProps} />);

      // Fill title first
      const formTab = screen.getByRole('tab', { name: 'タスクフォーム' });
      await user.click(formTab);
      
      const titleInput = screen.getByLabelText('タイトル *');
      await user.type(titleInput, '既存のタイトル');

      // Switch to chat and get estimate
      const chatTab = screen.getByRole('tab', { name: 'AI相談' });
      await user.click(chatTab);

      const messageInput = screen.getByLabelText('AIに送信するメッセージを入力');
      await user.type(messageInput, 'ユーザー認証システム');

      const sendButton = screen.getByRole('button', { name: 'メッセージを送信' });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/見積もり時間: 2.5時間/)).toBeInTheDocument();
      });

      const applyButton = screen.getByRole('button', { name: 'フォームに反映' });
      await user.click(applyButton);

      // Title should not be overwritten
      expect(screen.getByDisplayValue('既存のタイトル')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('ユーザー認証システム')).not.toBeInTheDocument();
    });
  });

  describe('Form Controls', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      render(<TaskForm {...mockTaskFormProps} />);

      const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
      await user.click(cancelButton);

      expect(mockTaskFormProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should handle all form fields correctly', async () => {
      render(<TaskForm {...mockTaskFormProps} />);

      const titleInput = screen.getByLabelText('タイトル *');
      await user.type(titleInput, 'テストタスク');

      const descriptionInput = screen.getByLabelText('詳細説明');
      await user.type(descriptionInput, 'テスト説明');

      const categoryInput = screen.getByLabelText('カテゴリ');
      await user.type(categoryInput, 'テストカテゴリ');

      const hoursInput = screen.getByLabelText('見積もり時間 (時間)');
      await user.type(hoursInput, '3');

      expect(screen.getByDisplayValue('テストタスク')).toBeInTheDocument();
      expect(screen.getByDisplayValue('テスト説明')).toBeInTheDocument();
      expect(screen.getByDisplayValue('テストカテゴリ')).toBeInTheDocument();
      expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    });

    it('should handle priority selection', async () => {
      render(<TaskForm {...mockTaskFormProps} />);

      const priorityTrigger = screen.getByRole('combobox');
      
      // Check default selection
      expect(priorityTrigger).toHaveTextContent('希望 (できれば今週中)');
    });

    it('should handle status selection for editing', () => {
      render(<TaskForm {...mockTaskFormPropsWithTask} />);

      // Status select should be visible when editing task
      const statusSelects = screen.getAllByRole('combobox');
      expect(statusSelects.length).toBeGreaterThan(1); // Priority + Status
    });
  });

  describe('Keyboard Navigation', () => {
    it('should send message on Enter key press', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEstimateResponse,
      });

      render(<TaskForm {...mockTaskFormProps} />);

      const chatTab = screen.getByRole('tab', { name: 'AI相談' });
      await user.click(chatTab);

      const messageInput = screen.getByLabelText('AIに送信するメッセージを入力');
      await user.type(messageInput, 'テストメッセージ');

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/estimate', expect.any(Object));
      });
    });

    it('should not send message on Shift+Enter', async () => {
      render(<TaskForm {...mockTaskFormProps} />);

      const chatTab = screen.getByRole('tab', { name: 'AI相談' });
      await user.click(chatTab);

      const messageInput = screen.getByLabelText('AIに送信するメッセージを入力');
      await user.type(messageInput, 'テストメッセージ');

      await user.keyboard('{Shift>}{Enter}{/Shift}');

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});