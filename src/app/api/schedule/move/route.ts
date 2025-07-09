import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/taskService';

export async function PUT(request: NextRequest) {
  try {
    const { taskId, targetDate, targetTime } = await request.json();

    // 入力値の検証
    if (!taskId || !targetDate) {
      return NextResponse.json(
        { error: 'taskId と targetDate は必須です' },
        { status: 400 }
      );
    }

    // 日付の形式チェック
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(targetDate)) {
      return NextResponse.json(
        { error: '無効な日付形式です (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // 時間の形式チェック（オプション）
    if (targetTime) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(targetTime)) {
        return NextResponse.json(
          { error: '無効な時間形式です (HH:MM)' },
          { status: 400 }
        );
      }
    }

    // 営業日チェック（月曜日から金曜日のみ）
    const targetDay = new Date(targetDate).getDay();
    if (targetDay === 0 || targetDay === 6) {
      return NextResponse.json(
        { error: '営業日（月曜日から金曜日）のみ指定できます' },
        { status: 400 }
      );
    }

    // タスクの存在チェック
    const task = TaskService.getTaskById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'タスクが見つかりません' },
        { status: 404 }
      );
    }

    // 時間競合チェック
    const startTime = targetTime || '09:00';
    const estimatedHours = task.estimated_hours || 1;
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const endHour = startHour + Math.floor(estimatedHours);
    const endMinute = startMinute + ((estimatedHours % 1) * 60);
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

    // 時間競合チェック
    if (TaskService.checkTimeConflicts(targetDate, startTime, endTime, taskId)) {
      return NextResponse.json(
        { error: '指定された時間帯に他のタスクが既にスケジュールされています' },
        { status: 409 }
      );
    }

    // タスクを移動
    const success = TaskService.moveTaskToDate(taskId, targetDate, targetTime);
    
    if (success) {
      return NextResponse.json(
        { message: 'タスクが正常に移動されました' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'タスクの移動に失敗しました' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('タスク移動エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}