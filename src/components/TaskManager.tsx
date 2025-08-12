'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Edit, Trash2, Clock, Calendar, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Task, TASK_STATUS_LABELS } from '@/lib/types';
import { TaskForm } from './TaskForm';
import { WeeklySchedule } from './WeeklySchedule';
import { Settings } from './Settings';
import { ThemeToggle } from './theme-toggle';
import { useToast } from '@/hooks/useToast';
import { getPriorityColorClass, getStatusColorClass, PRIORITY_LABELS } from '@/lib/constants/ui-constants';
import { Dashboard } from './layout/Dashboard';
import { InfoPanel } from './layout/InfoPanel';
import { QuickAdd } from './task/QuickAdd';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import type { QuickAction } from './layout/Sidebar';

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeView, setActiveView] = useState<'tasks' | 'schedule'>('tasks');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; taskId: number | null }>({
    isOpen: false,
    taskId: null
  });
  const { success, error } = useToast();

  // 最近使用したカテゴリを計算
  const recentCategories = useMemo(() => {
    const categories = tasks
      .filter(task => task.category)
      .map(task => task.category!)
      .reduce((acc, category) => {
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    return Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);
  }, [tasks]);

  // クイックアクションの定義
  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'new-task',
      label: '新規タスク',
      icon: Plus,
      action: () => setShowTaskForm(true),
      badge: undefined
    },
    {
      id: 'toggle-info',
      label: '情報パネル',
      icon: FileText,
      action: () => setShowInfoPanel(!showInfoPanel),
      badge: showInfoPanel ? '●' : undefined
    }
  ], [showInfoPanel]);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        error('タスクの取得に失敗しました');
      }
    } catch (err) {
      console.error('タスクの取得に失敗しました:', err);
      error('タスクの取得に失敗しました');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTaskCreated = (task: Task) => {
    setTasks([...tasks, task]);
    setShowTaskForm(false);
    // クイック追加からの場合はトーストは既に表示されているため、ここでは表示しない
    if (showTaskForm) {
      success('タスクを作成しました');
    }
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    setEditingTask(null);
    success('タスクを更新しました');
  };

  const handleDeleteTask = (taskId: number) => {
    setDeleteConfirmation({ isOpen: true, taskId });
  };

  const confirmDeleteTask = async () => {
    const { taskId } = deleteConfirmation;
    if (!taskId) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTasks(tasks.filter(task => task.id !== taskId));
        success('タスクを削除しました');
      } else {
        error('タスクの削除に失敗しました');
      }
    } catch (err) {
      console.error('タスクの削除に失敗しました:', err);
      error('タスクの削除に失敗しました');
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    return TASK_STATUS_LABELS[status];
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    if (!showInfoPanel) {
      setShowInfoPanel(true);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  const renderTaskList = () => (
    <div className="space-y-4">
      {/* クイック追加 */}
      <QuickAdd
        onTaskCreated={handleTaskCreated}
        recentCategories={recentCategories}
        enableAIEstimate={true}
      />

      {/* タスクリスト */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 mb-4">まだタスクがありません</p>
            <Button onClick={() => setShowTaskForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              最初のタスクを作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card 
              key={task.id} 
              className={`hover:shadow-md transition-shadow cursor-pointer ${
                selectedTask?.id === task.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleTaskClick(task)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <Badge className={getPriorityColorClass(task.priority)}>
                        {PRIORITY_LABELS[task.priority]}
                      </Badge>
                      <Badge className={getStatusColorClass(task.status)}>
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>
                    {task.description && (
                      <CardDescription>{task.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTask(task)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {task.category && (
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {task.category}
                      </span>
                    )}
                    {task.estimated_hours && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{task.estimated_hours}時間</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(task.created_at)}</span>
                    </div>
                  </div>
                  
                  {/* TODO: actual_hours フィールド実装時に進捗バー表示を有効化 (関連issue: #TBD) */}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Dashboard
      activeView={activeView}
      onViewChange={setActiveView}
      onSettingsClick={() => setShowSettings(true)}
      tasks={tasks}
      quickActions={quickActions}
      customization={{
        showInfoPanel: showInfoPanel,
        showSidebar: true
      }}
      infoPanelContent={
        <InfoPanel 
          selectedTask={selectedTask} 
          tasks={tasks}
        />
      }
    >
      <div className="h-full flex flex-col">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {activeView === 'tasks' ? 'タスク管理' : '週間スケジュール'}
          </h1>
          <div className="flex gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-auto">
          {activeView === 'tasks' ? renderTaskList() : (
            <WeeklySchedule tasks={tasks} onTaskUpdate={handleTaskUpdated} />
          )}
        </div>
      </div>

      {/* タスクフォーム */}
      {(showTaskForm || editingTask) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <TaskForm
              task={editingTask}
              onTaskCreated={handleTaskCreated}
              onTaskUpdated={handleTaskUpdated}
              onCancel={() => {
                setShowTaskForm(false);
                setEditingTask(null);
              }}
            />
          </div>
        </div>
      )}

      {/* 設定モーダル */}
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}

      {/* 削除確認ダイアログ */}
      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, taskId: null })}
        onConfirm={confirmDeleteTask}
        title="タスクの削除"
        message="このタスクを削除しますか？この操作は取り消せません。"
        confirmText="削除"
        cancelText="キャンセル"
        variant="destructive"
      />
    </Dashboard>
  );
}