import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/taskService';
import { TaskInput, TaskStatus } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効なタスクIDです' },
        { status: 400 }
      );
    }

    const taskService = new TaskService();
    const task = taskService.getTaskById(id);
    if (!task) {
      return NextResponse.json(
        { error: 'タスクが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('タスク取得エラー:', error);
    return NextResponse.json(
      { error: 'タスクの取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効なタスクIDです' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // バリデーション
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
    
    const taskInput: Partial<TaskInput> = {
      title: body.title,
      description: body.description,
      priority: body.priority,
      category: body.category,
      estimated_hours: body.estimated_hours,
      status: body.status,
    };

    const taskService = new TaskService();
    const task = taskService.updateTask(id, taskInput);
    
    if (!task) {
      return NextResponse.json(
        { error: 'タスクが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('タスク更新エラー:', error);
    return NextResponse.json(
      { error: 'タスクの更新に失敗しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効なタスクIDです' },
        { status: 400 }
      );
    }

    const taskService = new TaskService();
    const success = taskService.deleteTask(id);
    if (!success) {
      return NextResponse.json(
        { error: 'タスクが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'タスクを削除しました' });
  } catch (error) {
    console.error('タスク削除エラー:', error);
    return NextResponse.json(
      { error: 'タスクの削除に失敗しました' },
      { status: 500 }
    );
  }
}