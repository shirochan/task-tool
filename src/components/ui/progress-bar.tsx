import * as React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// タスク専用のプログレスバーコンポーネント
interface TaskProgressProps {
  estimatedHours?: number;
  actualHours?: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const TaskProgress = React.forwardRef<HTMLDivElement, TaskProgressProps>(
  ({ estimatedHours, actualHours = 0, className, showLabel = true, size = 'sm' }, ref) => {
    if (!estimatedHours || estimatedHours <= 0) {
      return null;
    }

    const rawPercentage = (actualHours / estimatedHours) * 100;
    const percentage = Math.min(rawPercentage, 100);
    
    // 進捗に応じたスタイル
    let progressColorClass = '';
    let progressBgClass = '';
    
    if (actualHours > estimatedHours) {
      // 超過（見積もり時間を超えた場合）
      progressColorClass = '[&>*]:bg-[var(--priority-must)]';
      progressBgClass = '[&]:bg-[var(--priority-must-bg)]';
    } else if (percentage >= 100) {
      // 完了（見積もり時間内で100%完了）
      progressColorClass = '[&>*]:bg-[var(--status-completed)]';
      progressBgClass = '[&]:bg-[var(--status-completed-bg)]';
    } else if (percentage >= 80) {
      // 警告（80%以上）
      progressColorClass = '[&>*]:bg-[var(--status-on-hold)]';
      progressBgClass = '[&]:bg-[var(--status-on-hold-bg)]';
    } else {
      // 進行中（80%未満）
      progressColorClass = '[&>*]:bg-[var(--status-in-progress)]';
      progressBgClass = '[&]:bg-[var(--status-in-progress-bg)]';
    }

    const sizeClasses = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3'
    };

    return (
      <div ref={ref} className={cn('task-progress w-full', className)}>
        {showLabel && (
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>作業時間: {actualHours}h / {estimatedHours}h</span>
            <span className={actualHours > estimatedHours ? 'text-[var(--priority-must)]' : ''}>
              {Math.round(rawPercentage)}%
            </span>
          </div>
        )}
        <Progress
          value={percentage}
          className={cn(
            sizeClasses[size],
            progressBgClass,
            progressColorClass
          )}
        />
      </div>
    );
  }
);

TaskProgress.displayName = 'TaskProgress';

export { TaskProgress };
export type { TaskProgressProps };