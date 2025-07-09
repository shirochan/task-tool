'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, RefreshCw, GripVertical } from 'lucide-react';
import { Task, TaskScheduleWithTask, DAYS_OF_WEEK } from '@/lib/types';
import { getISOWeekDates } from '@/lib/utils';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';

interface WeeklyScheduleProps {
  tasks: Task[];
}

// ドラッグ可能なタスクカード
interface DraggableTaskProps {
  task: TaskScheduleWithTask & {
    isFirstSlot?: boolean;
    isContinuation?: boolean;
    totalHours?: number;
  };
  isDragging?: boolean;
}

function DraggableTask({ task, isDragging = false }: DraggableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isActiveDragging,
  } = useDraggable({
    id: `task-${task.task_id}`,
    data: { task },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const getPriorityColor = (priority: 'must' | 'want') => {
    return priority === 'must' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  };

  // 継続中のタスクの場合は簡素化された表示
  if (task.isContinuation) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={`p-2 bg-gray-100 rounded border-l-4 border-gray-400 cursor-move transition-all ${
          isActiveDragging ? 'opacity-50 scale-95' : ''
        } ${isDragging ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center gap-2">
          <div
            {...listeners}
            className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-3 h-3" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-600 italic">
              {task.title} (継続中)
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`p-3 bg-gray-50 rounded-lg border cursor-move transition-all ${
        isActiveDragging ? 'opacity-50 scale-95' : ''
      } ${isDragging ? 'opacity-50' : ''} ${
        task.totalHours && task.totalHours > 1 ? 'border-l-4 border-blue-400' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          {...listeners}
          className="mt-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm mb-1">
            {task.title}
            {task.totalHours && task.totalHours > 1 && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {task.totalHours}h
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Badge className={getPriorityColor(task.priority)}>
              {task.priority === 'must' ? '必須' : '希望'}
            </Badge>
            {task.estimated_hours && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Clock className="w-3 h-3" />
                <span>{task.estimated_hours}h</span>
              </div>
            )}
          </div>
          {task.start_time && task.end_time && (
            <div className="text-xs text-gray-500 mt-1">
              {task.start_time} - {task.end_time}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ドロップ可能な時間スロット
interface DroppableTimeSlotProps {
  date: string;
  time: string;
  children: React.ReactNode;
  isOccupied: boolean;
}

function DroppableTimeSlot({ date, time, children, isOccupied }: DroppableTimeSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${date}-${time}`,
    data: { date, time },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-12 p-2 rounded border-2 border-dashed transition-all ${
        isOver && !isOccupied 
          ? 'border-blue-500 bg-blue-50' 
          : isOccupied 
          ? 'border-gray-200 bg-gray-50' 
          : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <div className="text-xs text-gray-500 mb-1">{time}</div>
      {children}
    </div>
  );
}

// ドロップ可能な日付カード
interface DroppableDayProps {
  date: string;
  scheduledTasks: TaskScheduleWithTask[];
  getDateLabel: (date: string) => string;
  getTotalHours: (date: string) => number;
  activeId: string | null;
}

function DroppableDay({ date, scheduledTasks, getDateLabel, getTotalHours, activeId }: DroppableDayProps) {
  // 1時間単位の時間スロットを生成（10:00-19:00）
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = 10 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // 各時間スロットのタスクを取得
  const getTasksForTimeSlot = (time: string) => {
    return scheduledTasks.filter(task => {
      if (!task.start_time) return false;
      const taskStartHour = parseInt(task.start_time.split(':')[0]);
      const slotHour = parseInt(time.split(':')[0]);
      const taskEndHour = task.end_time ? parseInt(task.end_time.split(':')[0]) : taskStartHour + 1;
      return taskStartHour <= slotHour && slotHour < taskEndHour;
    }).map(task => {
      const taskStartHour = parseInt(task.start_time!.split(':')[0]);
      const slotHour = parseInt(time.split(':')[0]);
      const taskEndHour = task.end_time ? parseInt(task.end_time.split(':')[0]) : taskStartHour + 1;
      
      // 初回表示かどうかを判定
      const isFirstSlot = taskStartHour === slotHour;
      // 継続中かどうかを判定
      const isContinuation = taskStartHour < slotHour;
      
      return {
        ...task,
        isFirstSlot,
        isContinuation,
        totalHours: taskEndHour - taskStartHour
      };
    });
  };

  return (
    <Card className="min-h-96">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          {getDateLabel(date)}
        </CardTitle>
        <div className="text-xs text-gray-500">
          {getTotalHours(date).toFixed(1)}時間
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {timeSlots.map((time) => {
          const slotTasks = getTasksForTimeSlot(time);
          const isOccupied = slotTasks.length > 0;
          
          return (
            <DroppableTimeSlot
              key={time}
              date={date}
              time={time}
              isOccupied={isOccupied}
            >
              {slotTasks.map((task) => (
                <DraggableTask
                  key={`${task.task_id}-${task.id}-${time}`}
                  task={task}
                  isDragging={activeId === `task-${task.task_id}`}
                />
              ))}
            </DroppableTimeSlot>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ドラッグ可能な未スケジュールタスク
interface DraggableUnscheduledTaskProps {
  task: Task;
}

function DraggableUnscheduledTask({ task }: DraggableUnscheduledTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `unscheduled-${task.id}`,
    data: { task, isUnscheduled: true },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const getPriorityColor = (priority: 'must' | 'want') => {
    return priority === 'must' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex items-center justify-between p-3 bg-gray-50 rounded cursor-move ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          {...listeners}
          className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </div>
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
  );
}

export function WeeklySchedule({ tasks }: WeeklyScheduleProps) {
  const [weeklySchedule, setWeeklySchedule] = useState<{[key: string]: TaskScheduleWithTask[]}>({});
  const [currentWeek, setCurrentWeek] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<TaskScheduleWithTask | Task | null>(null);

  // ドラッグ&ドロップ用のセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  useEffect(() => {
    generateCurrentWeek();
    fetchWeeklySchedule();
  }, []);

  const generateCurrentWeek = () => {
    const weekDates = getISOWeekDates();
    setCurrentWeek(weekDates);
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

  // ドラッグ&ドロップイベントハンドラー
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    const data = event.active.data.current;
    if (data?.task) {
      setDraggedTask(data.task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setDraggedTask(null);
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData?.task || !overData?.date) {
      setActiveId(null);
      setDraggedTask(null);
      return;
    }

    const task = activeData.task;
    const targetDate = overData.date;
    const targetTime = overData.time; // 時間スロット情報を取得

    try {
      let taskId: number;
      
      if (activeData.isUnscheduled) {
        // 未スケジュールタスクの場合
        taskId = task.id;
      } else {
        // 既存のスケジュールタスクの場合
        taskId = task.task_id;
      }

      const requestBody: {
        taskId: number;
        targetDate: string;
        targetTime?: string;
      } = {
        taskId,
        targetDate,
      };

      // 時間スロットが指定されている場合は時間を追加
      if (targetTime) {
        requestBody.targetTime = targetTime;
      }

      const response = await fetch('/api/schedule/move', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        await fetchWeeklySchedule();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'タスクの移動に失敗しました');
      }
    } catch (error) {
      console.error('タスク移動エラー:', error);
      alert('タスクの移動に失敗しました');
    }

    setActiveId(null);
    setDraggedTask(null);
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
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
                <DraggableUnscheduledTask key={task.id} task={task} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 週間カレンダー */}
      <div className="grid grid-cols-5 gap-4">
        {currentWeek.map((date) => (
          <DroppableDay
            key={date}
            date={date}
            scheduledTasks={weeklySchedule[date] || []}
            getDateLabel={getDateLabel}
            getTotalHours={getTotalHours}
            activeId={activeId}
          />
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
      
      {/* ドラッグオーバーレイ */}
      <DragOverlay modifiers={[snapCenterToCursor]}>
        {activeId && draggedTask ? (
          <div className="p-3 bg-white rounded-lg border shadow-lg max-w-64">
            <div className="font-medium text-sm mb-1 truncate">
              {draggedTask.title}
            </div>
            <div className="flex items-center justify-between">
              <Badge className={getPriorityColor(draggedTask.priority)}>
                {draggedTask.priority === 'must' ? '必須' : '希望'}
              </Badge>
              {draggedTask.estimated_hours && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>{draggedTask.estimated_hours}h</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}