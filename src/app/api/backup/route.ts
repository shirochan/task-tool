import { NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/taskService';

export async function GET() {
  try {
    const taskService = new TaskService();
    
    // すべてのデータを取得
    const tasks = taskService.getAllTasks();
    const settings = taskService.getAllSettings();
    const categories = taskService.getAllCategories();
    
    // 現在の週間スケジュールを取得
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    
    const startDate = monday.toISOString().split('T')[0];
    const endDate = friday.toISOString().split('T')[0];
    const schedules = taskService.getWeeklySchedule(startDate, endDate);
    
    // バックアップデータを作成
    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      data: {
        tasks,
        settings,
        categories,
        schedules
      }
    };
    
    return NextResponse.json(backupData, {
      headers: {
        'Content-Disposition': `attachment; filename="task-backup-${new Date().toISOString().split('T')[0]}.json"`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('バックアップの作成に失敗しました:', error);
    return NextResponse.json(
      { error: 'バックアップの作成に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const backupData = await request.json();
    
    // バックアップデータの検証
    if (!backupData.data || !backupData.data.tasks) {
      return NextResponse.json(
        { error: '無効なバックアップデータです' },
        { status: 400 }
      );
    }
    
    const taskService = new TaskService();
    
    // 設定を復元
    if (backupData.data.settings) {
      for (const setting of backupData.data.settings) {
        taskService.upsertSetting(setting.setting_key, setting.value);
      }
    }
    
    // カテゴリを復元
    if (backupData.data.categories) {
      for (const category of backupData.data.categories) {
        try {
          taskService.createCategory({
            name: category.name,
            color: category.color
          });
        } catch {
          // 既存のカテゴリがある場合はスキップ
          console.warn(`Category ${category.name} already exists, skipping`);
        }
      }
    }
    
    // タスクを復元
    let restoredTasks = 0;
    for (const task of backupData.data.tasks) {
      try {
        taskService.createTask({
          title: task.title,
          description: task.description,
          priority: task.priority,
          category: task.category,
          estimated_hours: task.estimated_hours
        });
        restoredTasks++;
      } catch (error) {
        console.warn(`Failed to restore task: ${task.title}`, error);
      }
    }
    
    // スケジュールを復元
    const restoredSchedules = 0;
    if (backupData.data.schedules) {
      for (const schedule of backupData.data.schedules) {
        try {
          // スケジュールにはtask_idが含まれているが、復元時は新しいIDが割り当てられる
          // タスクタイトルでマッチングするか、またはスケジュールは手動で再作成してもらう
          // 今回は安全のため、スケジュールの復元は将来の機能として保留
          console.log(`Schedule for date ${schedule.scheduled_date} found, but schedule restoration requires task ID mapping`);
        } catch (error) {
          console.warn(`Failed to restore schedule for date: ${schedule.scheduled_date}`, error);
        }
      }
    }
    
    return NextResponse.json({
      message: 'バックアップからの復元が完了しました',
      restored: {
        tasks: restoredTasks,
        settings: backupData.data.settings?.length || 0,
        categories: backupData.data.categories?.length || 0,
        schedules: restoredSchedules
      }
    });
    
  } catch (error) {
    console.error('バックアップの復元に失敗しました:', error);
    return NextResponse.json(
      { error: 'バックアップの復元に失敗しました' },
      { status: 500 }
    );
  }
}