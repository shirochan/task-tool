import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/taskService';
import { CustomCategoryInput } from '@/lib/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      );
    }

    const data: CustomCategoryInput = await request.json();
    
    if (!data.name) {
      return NextResponse.json(
        { error: 'カテゴリ名が必要です' },
        { status: 400 }
      );
    }

    const taskService = new TaskService();
    const category = await taskService.updateCategory(id, data);
    
    if (!category) {
      return NextResponse.json(
        { error: 'カテゴリが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('カテゴリの更新に失敗しました:', error);
    return NextResponse.json(
      { error: 'カテゴリの更新に失敗しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      );
    }

    const taskService = new TaskService();
    const success = await taskService.deleteCategory(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'カテゴリが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('カテゴリの削除に失敗しました:', error);
    return NextResponse.json(
      { error: 'カテゴリの削除に失敗しました' },
      { status: 500 }
    );
  }
}