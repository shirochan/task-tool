import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/taskService';
import { Task } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tasks }: { tasks: Task[] } = body;

    if (!tasks || tasks.length === 0) {
      return NextResponse.json(
        { error: 'スケジュールするタスクがありません' },
        { status: 400 }
      );
    }

    // Generate schedule using simple allocation algorithm
    const schedule = generateWeeklySchedule(tasks);
    
    // Save schedule to database
    await saveScheduleToDatabase(schedule);

    return NextResponse.json({ 
      message: 'スケジュールを生成しました',
      schedule 
    });
  } catch (error) {
    console.error('スケジュール生成エラー:', error);
    return NextResponse.json(
      { error: 'スケジュールの生成に失敗しました' },
      { status: 500 }
    );
  }
}

function generateWeeklySchedule(tasks: Task[]) {
  const schedule: { [key: string]: Task[] } = {};
  
  // Get current week dates (Monday to Friday)
  const today = new Date();
  const monday = new Date(today);
  // ISO週の開始日計算: 日曜日(0)を正しく前の週として扱う
  const dayOfWeek = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - dayOfWeek);
  
  const weekDates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    weekDates.push(dateStr);
    schedule[dateStr] = [];
  }

  // Sort tasks by priority (must first) and estimated hours
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.priority === 'must' && b.priority !== 'must') return -1;
    if (a.priority !== 'must' && b.priority === 'must') return 1;
    return (b.estimated_hours || 0) - (a.estimated_hours || 0);
  });

  // Daily work capacity (8 hours per day)
  const dailyCapacity = 8;
  const dailyUsage = weekDates.reduce((acc, date) => {
    acc[date] = 0;
    return acc;
  }, {} as { [key: string]: number });

  // Allocate tasks to days
  for (const task of sortedTasks) {
    const estimatedHours = task.estimated_hours || 2;
    
    // Find the day with the least usage that can fit this task
    let bestDay = '';
    let minUsage = Infinity;
    
    for (const date of weekDates) {
      if (dailyUsage[date] + estimatedHours <= dailyCapacity) {
        if (dailyUsage[date] < minUsage) {
          minUsage = dailyUsage[date];
          bestDay = date;
        }
      }
    }
    
    // If no day can fit the task, assign to the day with minimum usage
    if (!bestDay) {
      bestDay = weekDates.reduce((min, date) => 
        dailyUsage[date] < dailyUsage[min] ? date : min
      );
    }
    
    schedule[bestDay].push(task);
    dailyUsage[bestDay] += estimatedHours;
  }

  return schedule;
}

async function saveScheduleToDatabase(schedule: { [key: string]: Task[] }) {
  // Get current week date range
  const today = new Date();
  const monday = new Date(today);
  // ISO週の開始日計算: 日曜日(0)を正しく前の週として扱う
  const dayOfWeek = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - dayOfWeek);
  
  const startDate = monday.toISOString().split('T')[0];
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const endDate = friday.toISOString().split('T')[0];
  
  // Clear existing schedule for the current week
  TaskService.clearWeeklySchedule(startDate, endDate);
  
  // Save new schedule
  for (const [date, tasks] of Object.entries(schedule)) {
    const dayOfWeek = new Date(date).getDay();
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert Sunday from 0 to 7
    
    if (adjustedDay >= 1 && adjustedDay <= 5) { // Monday to Friday
      let currentTime = 9; // Start at 9 AM
      
      for (const task of tasks) {
        const estimatedHours = task.estimated_hours || 2;
        const startTime = `${Math.floor(currentTime).toString().padStart(2, '0')}:${((currentTime % 1) * 60).toString().padStart(2, '0')}`;
        const endHour = currentTime + estimatedHours;
        const endTime = `${Math.floor(endHour).toString().padStart(2, '0')}:${((endHour % 1) * 60).toString().padStart(2, '0')}`;
        
        TaskService.createTaskSchedule(
          task.id,
          adjustedDay,
          startTime,
          endTime,
          date
        );
        
        currentTime = endHour;
      }
    }
  }
}