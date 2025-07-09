'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, RefreshCw } from 'lucide-react';
import { Task, TaskScheduleWithTask, DAYS_OF_WEEK } from '@/lib/types';

interface WeeklyScheduleProps {
  tasks: Task[];
}

export function WeeklySchedule({ tasks }: WeeklyScheduleProps) {
  const [weeklySchedule, setWeeklySchedule] = useState<{[key: string]: TaskScheduleWithTask[]}>({});
  const [currentWeek, setCurrentWeek] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateCurrentWeek();
    fetchWeeklySchedule();
  }, []);

  const generateCurrentWeek = () => {
    const today = new Date();
    const monday = new Date(today);
    // ISO週の開始日計算: 日曜日(0)を正しく前の週として扱う
    const dayOfWeek = (today.getDay() + 6) % 7;
    monday.setDate(today.getDate() - dayOfWeek);
    
    const week: string[] = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      week.push(date.toISOString().split('T')[0]);
    }
    setCurrentWeek(week);
  };

  const fetchWeeklySchedule = async () => {
    try {
      const response = await fetch('/api/schedule');
      if (response.ok) {
        const data = await response.json();
        setWeeklySchedule(data);
      }
    } catch (error) {
      console.error('スケジュール取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSchedule = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tasks }),
      });

      if (response.ok) {
        await fetchWeeklySchedule();
      } else {
        alert('スケジュール生成に失敗しました');
      }
    } catch (error) {
      console.error('スケジュール生成エラー:', error);
      alert('スケジュール生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    const dayName = DAYS_OF_WEEK[dayOfWeek as keyof typeof DAYS_OF_WEEK];
    return `${dayName} ${date.getDate()}日`;
  };

  const getPriorityColor = (priority: 'must' | 'want') => {
    return priority === 'must' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  };

  const getTotalHours = (dateString: string) => {
    const dayTasks = weeklySchedule[dateString] || [];
    return dayTasks.reduce((total, task) => total + (task.estimated_hours || 0), 0);
  };

  const getAllScheduledTasks = () => {
    return Object.values(weeklySchedule).flat();
  };

  const getUnscheduledTasks = () => {
    const scheduledTaskIds = new Set(getAllScheduledTasks().map(t => t.task_id));
    return tasks.filter(task => !scheduledTaskIds.has(task.id));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">週間スケジュール</h2>
        <Button onClick={generateSchedule} disabled={isGenerating}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'スケジュール生成中...' : 'スケジュール生成'}
        </Button>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {getAllScheduledTasks().length}
            </div>
            <div className="text-sm text-gray-600">スケジュール済み</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {getUnscheduledTasks().length}
            </div>
            <div className="text-sm text-gray-600">未スケジュール</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {currentWeek.reduce((total, date) => total + getTotalHours(date), 0).toFixed(1)}h
            </div>
            <div className="text-sm text-gray-600">今週の予定時間</div>
          </CardContent>
        </Card>
      </div>

      {/* 未スケジュールタスク */}
      {getUnscheduledTasks().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">未スケジュールタスク</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getUnscheduledTasks().map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{task.title}</span>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority === 'must' ? '必須' : '希望'}
                    </Badge>
                  </div>
                  {task.estimated_hours && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{task.estimated_hours}h</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 週間カレンダー */}
      <div className="grid grid-cols-5 gap-4">
        {currentWeek.map((date) => (
          <Card key={date} className="min-h-96">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {getDateLabel(date)}
              </CardTitle>
              <div className="text-xs text-gray-500">
                {getTotalHours(date).toFixed(1)}時間
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {(weeklySchedule[date] || []).map((scheduleTask) => (
                <div
                  key={`${scheduleTask.task_id}-${scheduleTask.id}`}
                  className="p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="font-medium text-sm mb-1">
                    {scheduleTask.title}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge className={getPriorityColor(scheduleTask.priority)}>
                      {scheduleTask.priority === 'must' ? '必須' : '希望'}
                    </Badge>
                    {scheduleTask.estimated_hours && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span>{scheduleTask.estimated_hours}h</span>
                      </div>
                    )}
                  </div>
                  {scheduleTask.start_time && scheduleTask.end_time && (
                    <div className="text-xs text-gray-500 mt-1">
                      {scheduleTask.start_time} - {scheduleTask.end_time}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 空のスケジュール表示 */}
      {Object.keys(weeklySchedule).length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">まだスケジュールが生成されていません</p>
            <Button onClick={generateSchedule} disabled={isGenerating || tasks.length === 0}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              スケジュール生成
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}