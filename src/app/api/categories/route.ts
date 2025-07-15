import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/taskService';
import { CustomCategoryInput } from '@/lib/types';

export async function GET() {
  try {
    const taskService = new TaskService();
    const categories = await taskService.getAllCategories();
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error('カテゴリの取得に失敗しました:', error);
    return NextResponse.json(
      { error: 'カテゴリの取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: CustomCategoryInput = await request.json();
    
    if (!data.name) {
      return NextResponse.json(
        { error: 'カテゴリ名が必要です' },
        { status: 400 }
      );
    }

    const taskService = new TaskService();
    const category = await taskService.createCategory(data);
    
    return NextResponse.json(category);
  } catch (error) {
    console.error('カテゴリの作成に失敗しました:', error);
    return NextResponse.json(
      { error: 'カテゴリの作成に失敗しました' },
      { status: 500 }
    );
  }
}