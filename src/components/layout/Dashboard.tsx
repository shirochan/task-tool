'use client';

import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar, QuickAction } from './Sidebar';
import { Task } from '@/lib/types';

export interface DashboardCustomization {
  showSidebar: boolean;
  showInfoPanel: boolean;
  taskListWidth: number;
  scheduleWidth: number;
  sidebarCollapsed: boolean;
}

export interface DashboardProps {
  layout?: 'default' | 'compact' | 'spacious';
  customization?: Partial<DashboardCustomization>;
  activeView: 'tasks' | 'schedule';
  onViewChange: (view: 'tasks' | 'schedule') => void;
  onSettingsClick: () => void;
  tasks: Task[];
  quickActions?: QuickAction[];
  children: ReactNode;
  infoPanelContent?: ReactNode;
  className?: string;
}

const defaultCustomization: DashboardCustomization = {
  showSidebar: true,
  showInfoPanel: false,
  taskListWidth: 50,
  scheduleWidth: 50,
  sidebarCollapsed: false
};

export function Dashboard({
  layout = 'default',
  customization = {},
  activeView,
  onViewChange,
  onSettingsClick,
  tasks,
  quickActions = [],
  children,
  infoPanelContent,
  className
}: DashboardProps) {
  const config = { ...defaultCustomization, ...customization };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(config.sidebarCollapsed);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // レイアウトに応じたスタイル
  const layoutClasses = {
    default: 'gap-6',
    compact: 'gap-3',
    spacious: 'gap-8'
  };

  return (
    <div className={cn('min-h-screen bg-background flex', className)}>
      {/* サイドバー */}
      {config.showSidebar && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={handleSidebarToggle}
          quickActions={quickActions}
          activeView={activeView}
          onViewChange={onViewChange}
          onSettingsClick={onSettingsClick}
          tasks={tasks}
          className="shrink-0"
        />
      )}

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className={cn(
          'flex-1 p-6 overflow-hidden',
          layoutClasses[layout]
        )}>
          {children}
        </main>
      </div>

      {/* 情報パネル */}
      {config.showInfoPanel && infoPanelContent && (
        <div className="w-80 border-l bg-card shrink-0">
          {infoPanelContent}
        </div>
      )}
    </div>
  );
}