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

    const percentage = Math.min((actualHours / estimatedHours) * 100, 100);
    
    // 進捗に応じたスタイル
    let progressColorClass = '';
    let progressBgClass = '';
    
    if (percentage >= 100) {
      // 完了
      progressColorClass = '[&>*]:bg-[var(--status-completed)]';
      progressBgClass = '[&]:bg-[var(--status-completed-bg)]';
    } else if (actualHours > estimatedHours) {
      // 超過
      progressColorClass = '[&>*]:bg-[var(--priority-must)]';
      progressBgClass = '[&]:bg-[var(--priority-must-bg)]';
    } else if (percentage >= 80) {
      // 警告
      progressColorClass = '[&>*]:bg-[var(--status-on-hold)]';
      progressBgClass = '[&]:bg-[var(--status-on-hold-bg)]';
    } else {
      // 進行中
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
            <span>{Math.round(percentage)}%</span>
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