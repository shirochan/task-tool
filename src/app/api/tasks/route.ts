import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/taskService';
import { TaskInput, TaskStatus } from '@/lib/types';

export async function GET() {
  try {
    const taskService = new TaskService();
    const tasks = taskService.getAllTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('タスク取得エラー:', error);
    return NextResponse.json(
      { error: 'タスクの取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // バリデーション
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return NextResponse.json(
        { error: 'タイトルは必須です' },
        { status: 400 }
      );
    }
    
    const validStatuses: TaskStatus[] = ['pending', 'in_progress', 'on_hold', 'review', 'completed', 'cancelled'];
    const validPriorities = ['must', 'want'];
    
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: '無効なステータス値です' },
        { status: 400 }
      );
    }
    
    if (body.priority && !validPriorities.includes(body.priority)) {
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
      title: body.title,
      description: body.description,
      priority: body.priority ?? 'want',
      category: body.category,
      estimated_hours: body.estimated_hours,
      status: body.status ?? 'pending',
    };

    const taskService = new TaskService();
    const task = taskService.createTask(taskInput);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('タスク作成エラー:', error);
    return NextResponse.json(
      { error: 'タスクの作成に失敗しました' },
      { status: 500 }
    );
  }
}