import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/taskService';
import { TaskInput, TaskStatus } from '@/lib/types';
import { apiLogger, formatError } from '@/lib/logger';

export async function GET() {
  try {
    const taskService = new TaskService();
    const tasks = taskService.getAllTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    apiLogger.error({
      error: formatError(error),
      endpoint: 'GET /api/tasks'
    }, 'タスク一覧取得に失敗');
    return NextResponse.json(
      { error: 'タスクの取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> | undefined;
  try {
    body = await request.json();
    
    // バリデーション
    if (!body || !body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return NextResponse.json(
        { error: 'タイトルは必須です' },
        { status: 400 }
      );
    }
    
    const validStatuses: TaskStatus[] = ['pending', 'in_progress', 'on_hold', 'review', 'completed', 'cancelled'];
    const validPriorities = ['must', 'want'];
    
    if (body.status && !validStatuses.includes(body.status as TaskStatus)) {
      return NextResponse.json(
        { error: '無効なステータス値です' },
        { status: 400 }
      );
    }
    
    if (body.priority && !validPriorities.includes(body.priority as string)) {
      return NextResponse.json(
        { error: '無効な優先度値です' },
        { status: 400 }
      );
    }
    
    if (body.estimated_hours !== undefined && (typeof body.estimated_hours !== 'number' || body.estimated_hours < 0)) {
      return NextResponse.json(
        { error: '見積もり時間は0以上の数値である必要があります' },
        { status: 400 }
      );
    }
    
    const taskInput: TaskInput = {
      title: body.title as string,
      description: body.description as string | undefined,
      priority: (body.priority as 'must' | 'want') ?? 'want',
      category: body.category as string | undefined,
      estimated_hours: body.estimated_hours as number | undefined,
      status: (body.status as TaskStatus) ?? 'pending',
    };

    const taskService = new TaskService();
    const task = taskService.createTask(taskInput);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    apiLogger.error({
      error: formatError(error),
      endpoint: 'POST /api/tasks',
      taskData: body ? { title: body.title, priority: body.priority } : undefined
    }, 'タスク作成に失敗');
    return NextResponse.json(
      { error: 'タスクの作成に失敗しました' },
      { status: 500 }
    );
  }
}