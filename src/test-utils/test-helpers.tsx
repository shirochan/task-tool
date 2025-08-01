import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ThemeProvider } from '@/components/theme-provider';

// カスタムレンダー関数：テーマプロバイダーなどでラップ
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
    </ThemeProvider>
  );
};

// カスタムレンダー関数
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

// useRouter モック用のヘルパー
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
};

// fetch APIのモックヘルパー
export const mockFetch = (response: unknown, status: number = 200) => {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
};

// fetch APIのエラーモック
export const mockFetchError = (error: string) => {
  global.fetch = jest.fn().mockRejectedValueOnce(new Error(error));
};

// localStorage のモック
export const mockLocalStorage = () => {
  const storage: { [key: string]: string } = {};
  
  return {
    getItem: jest.fn((key: string) => storage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
  };
};

// 時間のモック用ヘルパー
export const mockDate = (isoString: string) => {
  const mockDate = new Date(isoString);
  jest.useFakeTimers();
  jest.setSystemTime(mockDate);
};

// 時間のモックをリセット
export const resetDateMock = () => {
  jest.useRealTimers();
};

// console.error の一時的な抑制
export const suppressConsoleError = () => {
  const originalError = console.error;
  console.error = jest.fn();
  return () => {
    console.error = originalError;
  };
};

// async/awaitでのエラーテスト用ヘルパー
export const expectAsyncError = async (asyncFn: () => Promise<unknown>, expectedError?: string) => {
  try {
    await asyncFn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (expectedError) {
      expect((error as Error).message).toContain(expectedError);
    }
  }
};

// デバッグ用：レンダリングされたHTMLを出力
export const debugRender = (element: React.ReactElement) => {
  const { container } = renderWithProviders(element);
  console.log(container.innerHTML);
  return container;
};