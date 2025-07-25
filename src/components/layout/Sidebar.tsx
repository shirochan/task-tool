'use client';

import { 
  Calendar, 
  Settings as SettingsIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  BarChart3,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Task } from '@/lib/types';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  badge?: string | number;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  quickActions: QuickAction[];
  activeView: 'tasks' | 'schedule';
  onViewChange: (view: 'tasks' | 'schedule') => void;
  onSettingsClick: () => void;
  tasks: Task[];
  className?: string;
}

export function Sidebar({ 
  collapsed, 
  onToggle, 
  quickActions, 
  activeView, 
  onViewChange, 
  onSettingsClick,
  tasks,
  className 
}: SidebarProps) {
  // 統計データの計算
  const stats = {
    total: tasks.length,
    completed: tasks.filter(task => task.status === 'completed').length,
    inProgress: tasks.filter(task => task.status === 'in_progress').length,
    pending: tasks.filter(task => task.status === 'pending').length,
    estimatedHours: tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0)
  };

  const navigationItems = [
    {
      id: 'tasks',
      label: 'タスク管理',
      icon: FileText,
      view: 'tasks' as const,
      badge: stats.total
    },
    {
      id: 'schedule',
      label: '週間スケジュール',
      icon: Calendar,
      view: 'schedule' as const,
      badge: stats.inProgress
    }
  ];

  return (
    <div className={cn(
      'flex flex-col bg-card border-r transition-all duration-300 ease-in-out',
      collapsed ? 'w-16' : 'w-64',
      className
    )}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <h2 className="text-lg font-semibold text-foreground">タスク管理</h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="ml-auto"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <Button
              key={item.id}
              variant={activeView === item.view ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewChange(item.view)}
              className={cn(
                'w-full justify-start',
                collapsed && 'px-2'
              )}
            >
              <item.icon className={cn('h-4 w-4', !collapsed && 'mr-2')} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-2 py-1 min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Button>
          ))}
        </div>

        {/* 統計サマリー */}
        {!collapsed && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                統計サマリー
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">合計タスク</span>
                <span className="font-medium">{stats.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">完了</span>
                <span className="font-medium text-green-600">{stats.completed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">進行中</span>
                <span className="font-medium text-blue-600">{stats.inProgress}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">未着手</span>
                <span className="font-medium text-gray-600">{stats.pending}</span>
              </div>
              {stats.estimatedHours > 0 && (
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    予定時間
                  </span>
                  <span className="font-medium">{stats.estimatedHours}h</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* クイックアクション */}
        {quickActions.length > 0 && (
          <div className="mt-6">
            {!collapsed && (
              <h3 className="text-sm font-medium text-muted-foreground px-2 mb-2">
                クイックアクション
              </h3>
            )}
            <div className="space-y-1">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  size="sm"
                  onClick={action.action}
                  className={cn(
                    'w-full justify-start',
                    collapsed && 'px-2'
                  )}
                  title={collapsed ? action.label : undefined}
                >
                  <action.icon className={cn('h-4 w-4', !collapsed && 'mr-2')} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{action.label}</span>
                      {action.badge && (
                        <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-2 py-1 min-w-[20px] text-center">
                          {action.badge}
                        </span>
                      )}
                    </>
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* フッター */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSettingsClick}
          className={cn(
            'w-full justify-start',
            collapsed && 'px-2'
          )}
          title={collapsed ? '設定' : undefined}
        >
          <SettingsIcon className={cn('h-4 w-4', !collapsed && 'mr-2')} />
          {!collapsed && <span>設定</span>}
        </Button>
      </div>
    </div>
  );
}