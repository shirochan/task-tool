'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { Task } from '@/lib/types';
import { cn } from '@/lib/utils';

interface QuickAddProps {
  onTaskCreated: (task: Task) => void;
  placeholder?: string;
  defaultPriority?: 'must' | 'want';
  defaultCategory?: string;
  recentCategories?: string[];
  className?: string;
  enableAIEstimate?: boolean;
}

interface QuickTaskData {
  title: string;
  priority: 'must' | 'want';
  category: string;
}

export function QuickAdd({
  onTaskCreated,
  placeholder = 'タスクを入力してEnterキーを押す...',
  defaultPriority = 'want',
  defaultCategory = '',
  recentCategories = [],
  className,
  enableAIEstimate = true
}: QuickAddProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiEstimateStatus, setAiEstimateStatus] = useState<'idle' | 'estimating' | 'success' | 'failed'>('idle');
  const [taskData, setTaskData] = useState<QuickTaskData>({
    title: '',
    priority: defaultPriority,
    category: defaultCategory
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();

  // フォーカス時に展開
  const handleInputFocus = () => {
    setIsExpanded(true);
  };

  // 外部クリック時に縮小
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.closest('.quick-add-container')?.contains(event.target as Node)) {
        if (!taskData.title.trim()) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [taskData.title]);

  const handleSubmit = async () => {
    if (!taskData.title.trim()) return;

    setIsSubmitting(true);

    try {
      // タスク作成のリクエスト
      const taskPayload = {
        title: taskData.title.trim(),
        priority: taskData.priority,
        category: taskData.category || undefined,
        description: '', // クイック追加では空
        estimated_hours: undefined // AI見積もりが無効な場合は未設定
      };

      // AI見積もりが有効な場合は並行して実行
      let estimatePromise: Promise<{ estimated_hours?: number } | null> | null = null;
      if (enableAIEstimate) {
        setAiEstimateStatus('estimating');
        estimatePromise = fetch('/api/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: taskData.title,
            description: '',
            category: taskData.category
          })
        }).then(res => res.ok ? res.json() : null).catch(() => null);
      }

      // タスク作成
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskPayload)
      });

      if (!response.ok) {
        throw new Error('タスクの作成に失敗しました');
      }

      let createdTask = await response.json();

      // AI見積もりの結果を取得して更新
      if (estimatePromise) {
        try {
          const estimate = await estimatePromise;
          if (estimate?.estimated_hours) {
            // タスクを見積もり時間で更新
            const updateResponse = await fetch(`/api/tasks/${createdTask.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...createdTask,
                estimated_hours: estimate.estimated_hours
              })
            });

            if (updateResponse.ok) {
              createdTask = await updateResponse.json();
              setAiEstimateStatus('success');
            } else {
              setAiEstimateStatus('failed');
            }
          } else {
            setAiEstimateStatus('failed');
            console.warn('AI見積もりの取得に失敗しました');
          }
        } catch (estimateError) {
          setAiEstimateStatus('failed');
          console.warn('AI見積もり処理中にエラーが発生しました:', estimateError);
        }
      }

      // 成功時の処理
      onTaskCreated(createdTask);
      success('タスクを作成しました');
      
      // フォームをリセット
      setTaskData({
        title: '',
        priority: defaultPriority,
        category: defaultCategory
      });
      setAiEstimateStatus('idle');
      setIsExpanded(false);

    } catch (err) {
      console.error('クイックタスク作成エラー:', err);
      error('タスクの作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setTaskData(prev => ({ ...prev, title: '' }));
      setIsExpanded(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className={cn('quick-add-container', className)}>
      <Card className={cn(
        'transition-all duration-200 ease-in-out',
        isExpanded ? 'shadow-md' : 'shadow-sm hover:shadow-md'
      )}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                ref={inputRef}
                value={taskData.title}
                onChange={(e) => setTaskData(prev => ({ ...prev, title: e.target.value }))}
                onFocus={handleInputFocus}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isSubmitting}
                className="border-0 shadow-none focus-visible:ring-0 p-0 text-sm"
              />
            </div>
            
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!taskData.title.trim() || isSubmitting}
              className="shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* 拡張オプション */}
          {isExpanded && (
            <div className="mt-4 space-y-3 pt-3 border-t animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">優先度</label>
                  <Select
                    value={taskData.priority}
                    onValueChange={(value: 'must' | 'want') => 
                      setTaskData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="must">必須</SelectItem>
                      <SelectItem value="want">希望</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">カテゴリ</label>
                  <Input
                    value={taskData.category}
                    onChange={(e) => setTaskData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="カテゴリ（オプション）"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* 最近使用したカテゴリ */}
              {recentCategories.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">最近使用</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {recentCategories.slice(0, 5).map((category, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary text-xs"
                        onClick={() => setTaskData(prev => ({ ...prev, category }))}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* AI見積もり表示 */}
              {enableAIEstimate && (
                <div className="flex items-center gap-2 text-xs">
                  {aiEstimateStatus === 'estimating' ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                      <span className="text-blue-600">AI見積もり実行中...</span>
                    </>
                  ) : aiEstimateStatus === 'success' ? (
                    <>
                      <Sparkles className="h-3 w-3 text-green-500" />
                      <span className="text-green-600">AI見積もり完了</span>
                    </>
                  ) : aiEstimateStatus === 'failed' ? (
                    <>
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      <span className="text-amber-600">AI見積もりは利用できませんでした</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">AI見積もりを自動実行します</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}