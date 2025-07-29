import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// MSW server setup for Node.js testing environment
export const server = setupServer(...handlers);

// テスト前にサーバーを開始
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// 各テスト後にハンドラーをリセット
afterEach(() => {
  server.resetHandlers();
});

// テスト後にサーバーを停止
afterAll(() => {
  server.close();
});