'use client';

import { useState } from 'react';
import { Task, TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Clock, Calendar, Tag, FileText, Star, Edit, Save } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { TimeTracker } from '@/components/task/TimeTracker';

interface TaskDetailProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (task: Task) => void;
}

export function TaskDetail({ task, isOpen, onClose, onUpdate }: TaskDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  if (!task) return null;
  
  // 必須フィールドの検証とデフォルト値の設定
  const validatedTask = {
    ...task,
    title: task.title || '',
    description: task.description || '',
    priority: task.priority || 'want',
    category: task.category || '',
    estimated_hours: task.estimated_hours || 0,
    actual_hours: task.actual_hours || 0,
    status: task.status || 'pending',
    created_at: task.created_at || new Date().toISOString(),
    updated_at: task.updated_at || new Date().toISOString()
  };

  const handleEdit = () => {
    setEditedTask({ ...validatedTask });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedTask(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editedTask) {
      console.error('編集されたタスクが存在しません');
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        title: editedTask.title,
        description: editedTask.description,
        priority: editedTask.priority,
        category: editedTask.category,
        estimated_hours: editedTask.estimated_hours,
        status: editedTask.status,
      };
      
      const response = await fetch(`/api/tasks/${validatedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (response.ok) {
        const updatedTask = await response.json();
        onUpdate?.(updatedTask);
        setIsEditing(false);
        setEditedTask(null);
        success('タスクを更新しました');
      } else {
        const errorData = await response.json();
        console.error('API応答エラー:', errorData);
        error(`タスクの更新に失敗しました: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('タスク更新エラー:', err);
      error('タスクの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: 'must' | 'want') => {
    return priority === 'must' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  };

  const getPriorityText = (priority: 'must' | 'want') => {
    return priority === 'must' ? '必須' : '希望';
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '不明';
    
    try {
      const date = new Date(dateString);
      // 無効な日付かチェック
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return '不明';
      }
      
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Date formatting error:', error, dateString);
      return '不明';
    }
  };

  const currentTask = isEditing ? editedTask! : validatedTask;
  
  // console.log('TaskDetail - 受け取ったタスク:', {
  //   originalTask: task,
  //   validatedTask: validatedTask,
  //   taskId: validatedTask.id,
  //   status: validatedTask.status,
  //   category: validatedTask.category,
  //   isEditing
  // });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">タスク詳細</span>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={handleEdit}>
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            タスクの詳細情報を表示・編集します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* タイトル */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium mb-2 block">
              タイトル
            </Label>
            {isEditing ? (
              <Input
                id="title"
                value={currentTask.title}
                onChange={(e) => setEditedTask({ ...currentTask, title: e.target.value })}
                placeholder="タスクタイトルを入力"
              />
            ) : (
              <h1 className="text-lg font-semibold">{currentTask.title}</h1>
            )}
          </div>

          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">優先度</Label>
              {isEditing ? (
                <Select
                  value={currentTask.priority}
                  onValueChange={(value: 'must' | 'want') => 
                    setEditedTask({ ...currentTask, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="must">必須</SelectItem>
                    <SelectItem value="want">希望</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={getPriorityColor(currentTask.priority)}>
                  <Star className="w-3 h-3 mr-1" />
                  {getPriorityText(currentTask.priority)}
                </Badge>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">ステータス</Label>
              {isEditing ? (
                <Select
                  value={currentTask.status}
                  onValueChange={(value: TaskStatus) => 
                    setEditedTask({ ...currentTask, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={TASK_STATUS_COLORS[currentTask.status]}>
                  {TASK_STATUS_LABELS[currentTask.status]}
                </Badge>
              )}
            </div>
          </div>

          {/* カテゴリと見積もり時間 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">カテゴリ</Label>
              {isEditing ? (
                <Input
                  value={currentTask.category || ''}
                  onChange={(e) => setEditedTask({ ...currentTask, category: e.target.value })}
                  placeholder="カテゴリを入力"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{currentTask.category || 'なし'}</span>
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">見積もり時間</Label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={currentTask.estimated_hours || ''}
                  onChange={(e) => setEditedTask({ 
                    ...currentTask, 
                    estimated_hours: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder="時間を入力"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    {currentTask.estimated_hours ? `${currentTask.estimated_hours}時間` : 'なし'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 説明 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">説明</Label>
            {isEditing ? (
              <Textarea
                value={currentTask.description || ''}
                onChange={(e) => setEditedTask({ ...currentTask, description: e.target.value })}
                placeholder="タスクの説明を入力"
                rows={4}
              />
            ) : (
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  {currentTask.description ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentTask.description}</p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">説明がありません</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 作成日時・更新日時 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">作成・更新情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">作成日時:</span>
                <span className="text-sm text-gray-600">{formatDateTime(currentTask.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">更新日時:</span>
                <span className="text-sm text-gray-600">{formatDateTime(currentTask.updated_at)}</span>
              </div>
            </CardContent>
          </Card>

          {/* TimeTracker - Time Tracking */}
          {!isEditing && (
            <TimeTracker task={validatedTask} onUpdate={onUpdate || (() => {})} />
          )}
        </div>

        {/* 編集時のアクションボタン */}
        {isEditing && (
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={handleCancelEdit} disabled={loading}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? '保存中...' : '保存'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}