import { http, HttpResponse } from 'msw';
import { mockTasks, mockTask, mockEstimateResponse, mockErrorResponse } from '@/test-utils/fixtures';

export const handlers = [
  // Tasks API handlers
  http.get('/api/tasks', () => {
    return HttpResponse.json(mockTasks);
  }),

  http.post('/api/tasks', async ({ request }) => {
    const body = await request.json();
    const newTask = {
      ...mockTask,
      id: Date.now(), // Simple ID generation for testing
      ...(body as Record<string, unknown>),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(newTask, { status: 201 });
  }),

  http.get('/api/tasks/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const task = mockTasks.find(t => t.id === id);
    
    if (!task) {
      return HttpResponse.json(mockErrorResponse, { status: 404 });
    }
    
    return HttpResponse.json(task);
  }),

  http.put('/api/tasks/:id', async ({ params, request }) => {
    const id = parseInt(params.id as string);
    const body = await request.json();
    const task = mockTasks.find(t => t.id === id);
    
    if (!task) {
      return HttpResponse.json(mockErrorResponse, { status: 404 });
    }
    
    const updatedTask = {
      ...task,
      ...(body as Record<string, unknown>),
      updated_at: new Date().toISOString(),
    };
    
    return HttpResponse.json(updatedTask);
  }),

  http.delete('/api/tasks/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const task = mockTasks.find(t => t.id === id);
    
    if (!task) {
      return HttpResponse.json(mockErrorResponse, { status: 404 });
    }
    
    return HttpResponse.json({ success: true });
  }),

  // AI Estimate API handlers
  http.post('/api/estimate', async ({ request }) => {
    const body = await request.json();
    
    // Simulate validation
    const bodyData = body as Record<string, unknown>;
    const task = bodyData?.task as Record<string, unknown>;
    if (!task?.title) {
      return HttpResponse.json(
        { error: 'タスクのタイトルは必須です' },
        { status: 400 }
      );
    }
    
    return HttpResponse.json(mockEstimateResponse);
  }),

  // OpenAI API mock (for testing AI service)
  http.post('https://api.openai.com/v1/chat/completions', async ({ request }) => {
    const body = await request.json();
    
    // Validate request body
    const { model, messages, temperature } = body as Record<string, unknown>;
    if (!model || typeof model !== 'string') {
      return HttpResponse.json(
        { error: 'The "model" field is required and must be a string.' },
        { status: 400 }
      );
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return HttpResponse.json(
        { error: 'The "messages" field is required and must be a non-empty array.' },
        { status: 400 }
      );
    }
    if (temperature !== undefined && typeof temperature !== 'number') {
      return HttpResponse.json(
        { error: 'The "temperature" field, if provided, must be a number.' },
        { status: 400 }
      );
    }
    
    // Simulate successful OpenAI response
    return HttpResponse.json({
      choices: [
        {
          message: {
            content: JSON.stringify(mockEstimateResponse),
          },
        },
      ],
    });
  }),

  // Schedule API handlers
  http.get('/api/schedule', () => {
    return HttpResponse.json({
      '2024-01-01': [],
      '2024-01-02': [],
      '2024-01-03': [],
      '2024-01-04': [],
      '2024-01-05': [],
    });
  }),

  http.post('/api/schedule/generate', () => {
    return HttpResponse.json({ success: true });
  }),

  http.put('/api/schedule/:id', async () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/schedule/move', async () => {
    return HttpResponse.json({ success: true });
  }),

  // Settings API handlers
  http.get('/api/settings', () => {
    return HttpResponse.json({
      work_start_time: '09:00',
      work_end_time: '18:00',
      daily_work_hours: 8,
      theme: 'light',
      compact_view: false,
      ai_enabled: true,
      notification_enabled: true,
    });
  }),

  http.post('/api/settings', async () => {
    return HttpResponse.json({ success: true });
  }),

  // Categories API handlers
  http.get('/api/categories', () => {
    return HttpResponse.json([
      { id: 1, name: 'テスト', color: '#3b82f6' },
      { id: 2, name: '開発', color: '#10b981' },
    ]);
  }),

  http.post('/api/categories', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: Date.now(),
      ...(body as Record<string, unknown>),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  // Backup API handlers
  http.post('/api/backup', () => {
    return HttpResponse.json({
      success: true,
      filename: 'backup_2024-01-01.json',
    });
  }),
];

// Error handlers for testing error scenarios
export const errorHandlers = [
  http.get('/api/tasks', () => {
    return HttpResponse.json(mockErrorResponse, { status: 500 });
  }),

  http.post('/api/estimate', () => {
    return HttpResponse.json(mockErrorResponse, { status: 500 });
  }),

  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json(mockErrorResponse, { status: 500 });
  }),
];