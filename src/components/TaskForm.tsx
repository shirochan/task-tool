'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task } from '@/lib/types';

const taskSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  priority: z.enum(['must', 'want']),
  category: z.string().optional(),
  estimated_hours: z.number().min(0).optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  task?: Task | null;
  onTaskCreated: (task: Task) => void;
  onTaskUpdated: (task: Task) => void;
  onCancel: () => void;
}

export function TaskForm({ task, onTaskCreated, onTaskUpdated, onCancel }: TaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateDetails, setEstimateDetails] = useState<{
    hours: number;
    reasoning: string;
    questions: string[];
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: task ? {
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      category: task.category || '',
      estimated_hours: task.estimated_hours || undefined,
    } : {
      priority: 'want',
    },
  });

  const handleAIEstimate = async () => {
    const formData = getValues();
    if (!formData.title) {
      alert('タイトルを入力してください');
      return;
    }

    setIsEstimating(true);
    try {
      const response = await fetch('/api/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: formData,
        }),
      });

      if (response.ok) {
        const estimate = await response.json();
        setEstimateDetails(estimate);
        setValue('estimated_hours', estimate.hours);
      } else {
        alert('見積もりの取得に失敗しました');
      }
    } catch (error) {
      console.error('見積もりエラー:', error);
      alert('見積もりの取得に失敗しました');
    } finally {
      setIsEstimating(false);
    }
  };

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      const url = task ? `/api/tasks/${task.id}` : '/api/tasks';
      const method = task ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        if (task) {
          onTaskUpdated(result);
        } else {
          onTaskCreated(result);
        }
      } else {
        alert('タスクの保存に失敗しました');
      }
    } catch (error) {
      console.error('タスク保存エラー:', error);
      alert('タスクの保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{task ? 'タスク編集' : '新規タスク'}</CardTitle>
        <CardDescription>
          {task ? 'タスクの情報を編集します' : 'AIが自動で作業時間を見積もります'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">タイトル *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="例: プレゼンテーション資料作成"
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">詳細説明</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="タスクの詳細を記入してください。AIがより正確な見積もりを行います。"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">優先度 *</Label>
              <Select
                value={watch('priority')}
                onValueChange={(value) => setValue('priority', value as 'must' | 'want')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="優先度を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="must">必須 (今週中に完了)</SelectItem>
                  <SelectItem value="want">希望 (できれば今週中)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">カテゴリ</Label>
              <Input
                id="category"
                {...register('category')}
                placeholder="例: 仕事, 勉強, 個人"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="estimated_hours">見積もり時間 (時間)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAIEstimate}
                disabled={isEstimating}
              >
                {isEstimating ? 'AI見積もり中...' : 'AI見積もり'}
              </Button>
            </div>
            <Input
              id="estimated_hours"
              type="number"
              step="0.5"
              min="0"
              {...register('estimated_hours', { valueAsNumber: true })}
              placeholder="例: 2.5"
            />
          </div>

          {estimateDetails && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">AI見積もり結果</h4>
              <p className="text-sm text-blue-800 mb-2">
                推定時間: {estimateDetails.hours}時間
              </p>
              <p className="text-sm text-blue-700 mb-2">
                理由: {estimateDetails.reasoning}
              </p>
              {estimateDetails.questions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    より正確な見積もりのための質問:
                  </p>
                  <ul className="text-sm text-blue-700 list-disc list-inside">
                    {estimateDetails.questions.map((question, index) => (
                      <li key={index}>{question}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : task ? '更新' : '作成'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}