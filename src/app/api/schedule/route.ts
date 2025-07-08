import { NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/taskService';

export async function GET() {
  try {
    const weeklySchedule = TaskService.generateWeeklySchedule();
    return NextResponse.json(weeklySchedule);
  } catch (error) {
    console.error('スケジュール取得エラー:', error);
    return NextResponse.json(
      { error: 'スケジュールの取得に失敗しました' },
      { status: 500 }
    );
  }
}