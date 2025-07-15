import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/taskService';
import { UserSettingInput } from '@/lib/types';

export async function GET() {
  try {
    const taskService = new TaskService();
    const settings = await taskService.getAllSettings();
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('設定の取得に失敗しました:', error);
    return NextResponse.json(
      { error: '設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: UserSettingInput = await request.json();
    
    if (!data.key || !data.value) {
      return NextResponse.json(
        { error: 'キーと値が必要です' },
        { status: 400 }
      );
    }

    const taskService = new TaskService();
    const setting = await taskService.upsertSetting(data.key, data.value);
    
    return NextResponse.json(setting);
  } catch (error) {
    console.error('設定の保存に失敗しました:', error);
    return NextResponse.json(
      { error: '設定の保存に失敗しました' },
      { status: 500 }
    );
  }
}