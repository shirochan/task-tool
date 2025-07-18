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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Bot, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Task, TASK_STATUS_LABELS, TaskStatus } from '@/lib/types';

const taskSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  priority: z.enum(['must', 'want']),
  category: z.string().optional(),
  estimated_hours: z.number().min(0).optional(),
  status: z.enum(['pending', 'in_progress', 'on_hold', 'review', 'completed', 'cancelled']).optional(),
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
  const [chatMessages, setChatMessages] = useState<{
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
  }[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [activeTab, setActiveTab] = useState('form');
  const [isComposing, setIsComposing] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{
    sessionId: string;
    lastMessage: string;
    lastActivity: Date;
    messageCount: number;
  }>>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<{
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
  }[]>([]);

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
      status: task.status,
    } : {
      priority: 'want',
      status: 'pending',
    },
  });


  const handleChatSubmit = async () => {
    if (!currentMessage.trim()) return;

    const userMessage = {
      type: 'user' as const,
      content: currentMessage,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsEstimating(true);

    try {
      const formData = getValues();
      const taskData = {
        title: formData.title || currentMessage, // チャットメッセージをタイトルとして使用
        description: formData.description || currentMessage,
        priority: formData.priority || 'want',
        category: formData.category,
        estimated_hours: formData.estimated_hours,
      };
      
      const response = await fetch('/api/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: taskData,
        }),
      });

      if (response.ok) {
        const estimate = await response.json();
        const estimateData = {
          hours: estimate.estimated_hours || estimate.hours,
          reasoning: estimate.reasoning,
          questions: estimate.questions || [],
        };
        
        const aiMessage = {
          type: 'ai' as const,
          content: `見積もり時間: ${estimateData.hours}時間\n\n理由: ${estimateData.reasoning}\n\n${estimateData.questions.length > 0 ? `質問: ${estimateData.questions.join(', ')}` : ''}`,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, aiMessage]);
        setEstimateDetails(estimateData);
      } else {
        const errorData = await response.json().catch(() => ({ error: '不明なエラー' }));
        const errorMessage = {
          type: 'ai' as const,
          content: `申し訳ありませんが、見積もりの取得に失敗しました。\nエラー: ${errorData.error || 'サーバーエラー'}`,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('チャットエラー:', error);
      const errorMessage = {
        type: 'ai' as const,
        content: `申し訳ありませんが、エラーが発生しました。\n詳細: ${error instanceof Error ? error.message : 'ネットワークエラー'}`,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsEstimating(false);
    }
  };

  // チャット履歴を読み込む関数
  const loadChatHistory = async () => {
    try {
      const response = await fetch('/api/consultation/history');
      if (response.ok) {
        const data = await response.json();
        setChatHistory(data.sessions || []);
      }
    } catch (error) {
      console.error('履歴読み込みエラー:', error);
    }
  };

  // 特定のセッションの履歴を読み込む関数
  const loadSessionMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/consultation?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSessionMessages(data.history || []);
        setSelectedSessionId(sessionId);
      }
    } catch (error) {
      console.error('セッション履歴読み込みエラー:', error);
    }
  };

  const handleApplyToForm = () => {
    if (!estimateDetails) return;

    setValue('estimated_hours', estimateDetails.hours);
    
    if (estimateDetails.reasoning && !watch('description')) {
      setValue('description', estimateDetails.reasoning);
    }
    
    // チャットメッセージからタイトルを自動生成
    const userMessages = chatMessages.filter(msg => msg.type === 'user');
    if (userMessages.length > 0 && !watch('title')) {
      const firstUserMessage = userMessages[0].content;
      // メッセージの最初の50文字程度をタイトルとして使用
      const title = firstUserMessage.split('\n')[0].substring(0, 50);
      setValue('title', title);
    }
    
    setActiveTab('form');
    toast.success('AI見積もりをフォームに反映しました（タイトル、説明、見積もり時間）');
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
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{task ? 'タスク編集' : '新規タスク'}</CardTitle>
        <CardDescription>
          {task ? 'タスクの情報を編集します' : 'AIチャットでタスクを詳しく相談して、フォームに自動反映できます'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="form">タスクフォーム</TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI相談
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              履歴
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border">
              <h3 className="font-medium text-blue-900 mb-2">AIアシスタントとの相談</h3>
              <p className="text-sm text-blue-700 mb-3">
                タスクの詳細について相談して、より正確な見積もりを取得しましょう。
                結果はフォームに自動反映できます。
              </p>
              
              <ScrollArea className="h-96 w-full border rounded-lg bg-white p-4">
                <div 
                  className="space-y-4" 
                  role="log" 
                  aria-live="polite" 
                  aria-label="AIチャット履歴"
                >
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Bot className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>タスクについて何でも聞いてください</p>
                    </div>
                  ) : (
                    chatMessages.map((message, index) => (
                      <div key={`${message.timestamp.getTime()}-${index}`} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div 
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.type === 'user' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}
                          role="article"
                          aria-label={`${message.type === 'user' ? 'ユーザー' : 'AI'}からのメッセージ`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {message.type === 'user' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                            <span className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {isEstimating && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 animate-pulse" />
                          <span className="text-xs">考え中...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="flex gap-2 mt-4">
                <Textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="タスクについて質問してください... (Shift+Enterで改行、Enterで送信)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                      e.preventDefault();
                      handleChatSubmit();
                    }
                  }}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  disabled={isEstimating}
                  rows={2}
                  className="resize-none"
                  aria-label="AIに送信するメッセージを入力"
                  aria-describedby="chat-input-help"
                />
                <Button 
                  onClick={handleChatSubmit} 
                  disabled={isEstimating || !currentMessage.trim()}
                  aria-label="メッセージを送信"
                >
                  送信
                </Button>
              </div>
              
              <div id="chat-input-help" className="sr-only">
                Shift+Enterで改行、Enterで送信します
              </div>
              
              {estimateDetails && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-900">見積もり結果: {estimateDetails.hours}時間</p>
                      <p className="text-xs text-green-700">この内容をフォームに反映できます</p>
                    </div>
                    <Button size="sm" onClick={handleApplyToForm} className="bg-green-600 hover:bg-green-700">
                      <ArrowRight className="h-4 w-4 mr-1" />
                      フォームに反映
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-lg border">
              <h3 className="font-medium text-green-900 mb-2">チャット履歴</h3>
              <p className="text-sm text-green-700 mb-3">
                過去のAI相談履歴を確認できます。
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 履歴一覧 */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">セッション一覧</h4>
                  <ScrollArea className="h-64 border rounded-lg bg-white p-2">
                    {chatHistory.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">履歴がありません</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={loadChatHistory}
                        >
                          履歴を読み込む
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {chatHistory.map((session) => (
                          <div
                            key={session.sessionId}
                            className={`p-2 rounded cursor-pointer transition-colors ${
                              selectedSessionId === session.sessionId
                                ? 'bg-blue-100 border-blue-300'
                                : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                            onClick={() => loadSessionMessages(session.sessionId)}
                          >
                            <div className="text-sm font-medium truncate">
                              {session.lastMessage}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {session.messageCount}件のメッセージ • {session.lastActivity.toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
                
                {/* 選択されたセッションの詳細 */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">メッセージ履歴</h4>
                  <ScrollArea className="h-64 border rounded-lg bg-white p-2">
                    {selectedSessionId && sessionMessages.length > 0 ? (
                      <div className="space-y-2">
                        {sessionMessages.map((message, index) => (
                          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div 
                              className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                                message.type === 'user' 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              <div className="text-xs opacity-70 mt-1">
                                {message.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">セッションを選択してください</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="form" className="space-y-4">
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
          
          {/* ステータス選択（編集時のみ表示） */}
          {task && (
            <div className="space-y-2">
              <Label htmlFor="status">ステータス</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as TaskStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ステータスを選択" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="estimated_hours">見積もり時間 (時間)</Label>
            <Input
              id="estimated_hours"
              type="number"
              step="0.5"
              min="0"
              {...register('estimated_hours', { valueAsNumber: true })}
              placeholder="例: 2.5 (AI相談タブで自動見積もり可能)"
            />
          </div>


          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : task ? '更新' : '作成'}
            </Button>
          </div>
        </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}