'use client';

import { useMemo } from 'react';
import { Clock, Calendar, Tag, Users, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Task } from '@/lib/types';
import { getPriorityColorClass, getStatusColorClass, PRIORITY_LABELS } from '@/lib/constants/ui-constants';
import { TaskProgress } from '@/components/ui/progress-bar';

export interface TaskStatistics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalEstimatedHours: number;
  averageTaskDuration: number;
  completionRate: number;
}

interface InfoPanelProps {
  selectedTask: Task | null;
  tasks: Task[];
  className?: string;
}

export function InfoPanel({ selectedTask, tasks, className }: InfoPanelProps) {
  // 統計データの計算
  const statistics = useMemo((): TaskStatistics => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
    const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
    const averageTaskDuration = totalTasks > 0 ? totalEstimatedHours / totalTasks : 0;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      totalEstimatedHours,
      averageTaskDuration,
      completionRate
    };
  }, [tasks]);

  // 関連タスクの検索
  const relatedTasks = useMemo(() => {
    if (!selectedTask) return [];
    
    return tasks
      .filter(task => 
        task.id !== selectedTask.id && (
          task.category === selectedTask.category ||
          task.priority === selectedTask.priority
        )
      )
      .slice(0, 5);
  }, [selectedTask, tasks]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">情報パネル</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* 選択されたタスクの詳細 */}
          {selectedTask ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  選択タスク詳細
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">タイトル</h3>
                  <p className="text-sm">{selectedTask.title}</p>
                </div>

                {selectedTask.description && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">説明</h3>
                    <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">優先度</h3>
                    <Badge className={getPriorityColorClass(selectedTask.priority)}>
                      {PRIORITY_LABELS[selectedTask.priority]}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">ステータス</h3>
                    <Badge className={getStatusColorClass(selectedTask.status)}>
                      {selectedTask.status}
                    </Badge>
                  </div>
                </div>

                {selectedTask.category && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">カテゴリ</h3>
                    <span className="text-sm bg-secondary px-2 py-1 rounded">
                      {selectedTask.category}
                    </span>
                  </div>
                )}

                {selectedTask.estimated_hours && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">見積もり時間</h3>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{selectedTask.estimated_hours}時間</span>
                    </div>
                    <div className="mt-2">
                      <TaskProgress
                        estimatedHours={selectedTask.estimated_hours}
                        actualHours={0} // 将来的に実績時間フィールドが追加されたら使用
                        showLabel={true}
                        size="sm"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">作成日時</h3>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">{formatDate(selectedTask.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Tag className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  タスクを選択すると詳細情報を表示します
                </p>
              </CardContent>
            </Card>
          )}

          {/* 関連タスク */}
          {relatedTasks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  関連タスク
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relatedTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-3 p-2 rounded hover:bg-secondary/50 cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getPriorityColorClass(task.priority)} variant="outline">
                            {PRIORITY_LABELS[task.priority]}
                          </Badge>
                          {task.category && (
                            <span className="text-xs text-muted-foreground">{task.category}</span>
                          )}
                        </div>
                      </div>
                      {task.estimated_hours && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {task.estimated_hours}h
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 統計情報 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                作業時間統計
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{statistics.totalTasks}</div>
                  <div className="text-xs text-muted-foreground">総タスク数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{statistics.completedTasks}</div>
                  <div className="text-xs text-muted-foreground">完了済み</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">完了率</span>
                  <span className="text-sm font-medium">{Math.round(statistics.completionRate)}%</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">総予定時間</span>
                  <span className="text-sm font-medium">{statistics.totalEstimatedHours}h</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">平均見積もり</span>
                  <span className="text-sm font-medium">{Math.round(statistics.averageTaskDuration * 10) / 10}h</span>
                </div>
              </div>

              {/* 進行中タスクの表示 */}
              {statistics.inProgressTasks > 0 && (
                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">進行中: {statistics.inProgressTasks}件</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}