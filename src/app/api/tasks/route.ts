import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/taskService';
import { TaskInput } from '@/lib/types';

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
    const taskInput: TaskInput = {
      title: body.title,
      description: body.description,
      priority: body.priority,
      category: body.category,
      estimated_hours: body.estimated_hours,
      status: body.status,
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