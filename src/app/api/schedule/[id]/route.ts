import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/taskService';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const scheduleId = parseInt(params.id);
    
    if (isNaN(scheduleId)) {
      return NextResponse.json(
        { error: '無効なスケジュールIDです' },
        { status: 400 }
      );
    }

    const { start_time, end_time, scheduled_date } = await request.json();

    // 少なくとも1つのフィールドが更新対象である必要がある
    if (!start_time && !end_time && !scheduled_date) {
      return NextResponse.json(
        { error: '更新するフィールドを指定してください' },
        { status: 400 }
      );
    }

    // 日付の形式チェック
    if (scheduled_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(scheduled_date)) {
        return NextResponse.json(
          { error: '無効な日付形式です (YYYY-MM-DD)' },
          { status: 400 }
        );
      }

      // 営業日チェック（月曜日から金曜日のみ）
      const targetDay = new Date(scheduled_date).getDay();
      if (targetDay === 0 || targetDay === 6) {
        return NextResponse.json(
          { error: '営業日（月曜日から金曜日）のみ指定できます' },
          { status: 400 }
        );
      }
    }

    // 時間の形式チェック
    if (start_time) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(start_time)) {
        return NextResponse.json(
          { error: '無効な開始時間形式です (HH:MM)' },
          { status: 400 }
        );
      }
    }

    if (end_time) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(end_time)) {
        return NextResponse.json(
          { error: '無効な終了時間形式です (HH:MM)' },
          { status: 400 }
        );
      }
    }

    // 開始時間と終了時間の論理チェック
    if (start_time && end_time && start_time >= end_time) {
      return NextResponse.json(
        { error: '開始時間は終了時間より前である必要があります' },
        { status: 400 }
      );
    }

    // スケジュールの更新
    const success = TaskService.updateTaskSchedule(scheduleId, {
      start_time,
      end_time,
      scheduled_date
    });

    if (success) {
      return NextResponse.json(
        { message: 'スケジュールが正常に更新されました' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'スケジュールが見つからないか、更新に失敗しました' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('スケジュール更新エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}