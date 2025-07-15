'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Clock, Calendar, Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Task } from '@/lib/types';
import { TaskForm } from './TaskForm';
import { WeeklySchedule } from './WeeklySchedule';
import { Settings } from './Settings';

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'schedule'>('tasks');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('タスクの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (task: Task) => {
    setTasks([...tasks, task]);
    setShowTaskForm(false);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    setEditingTask(null);
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('このタスクを削除しますか？')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTasks(tasks.filter(task => task.id !== taskId));
      }
    } catch (error) {
      console.error('タスクの削除に失敗しました:', error);
    }
  };

  const getPriorityColor = (priority: 'must' | 'want') => {
    return priority === 'must' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  };

  const getPriorityLabel = (priority: 'must' | 'want') => {
    return priority === 'must' ? '必須' : '希望';
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

  return (
    <div className="max-w-6xl mx-auto">
      {/* タブナビゲーション */}
      <div className="flex mb-6 border-b">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'tasks'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          タスク管理
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'schedule'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          週間スケジュール
        </button>
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <SettingsIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* 新規タスク作成ボタン */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">タスク一覧</h2>
            <Button onClick={() => setShowTaskForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              新規タスク
            </Button>
          </div>

          {/* タスクフォーム */}
          {(showTaskForm || editingTask) && (
            <TaskForm
              task={editingTask}
              onTaskCreated={handleTaskCreated}
              onTaskUpdated={handleTaskUpdated}
              onCancel={() => {
                setShowTaskForm(false);
                setEditingTask(null);
              }}
            />
          )}

          {/* タスクリスト */}
          <div className="space-y-4">
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
              tasks.map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                          <Badge className={getPriorityColor(task.priority)}>
                            {getPriorityLabel(task.priority)}
                          </Badge>
                        </div>
                        {task.description && (
                          <CardDescription>{task.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
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
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <WeeklySchedule tasks={tasks} />
      )}

      {/* 設定モーダル */}
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}