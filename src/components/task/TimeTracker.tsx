'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task } from '@/lib/types';
import { useToast } from '@/hooks/useToast';

interface TimeTrackerProps {
  task: Task;
  onUpdate: (updatedTask: Task) => void;
}

interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsedTime: number; // seconds
}

export function TimeTracker({ task, onUpdate }: TimeTrackerProps) {
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
  });
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualHours, setManualHours] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const storageKey = `timeTracker_${task.id}`;

  // Load saved timer state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as TimerState;
        // If timer was running, calculate elapsed time since last save
        if (parsed.isRunning && parsed.startTime) {
          const now = Date.now();
          const additionalElapsed = Math.floor((now - parsed.startTime) / 1000);
          setTimerState({
            isRunning: true,
            startTime: now,
            elapsedTime: parsed.elapsedTime + additionalElapsed,
          });
        } else {
          setTimerState(parsed);
        }
      } catch (e) {
        console.error('Failed to parse timer state:', e);
      }
    }
  }, [storageKey]);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(timerState));
  }, [timerState, storageKey]);

  // Update elapsed time every second when running
  useEffect(() => {
    if (timerState.isRunning) {
      intervalRef.current = setInterval(() => {
        setTimerState(prev => ({
          ...prev,
          elapsedTime: prev.elapsedTime + 1,
        }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setTimerState({
      isRunning: true,
      startTime: Date.now(),
      elapsedTime: timerState.elapsedTime,
    });
  };

  const handlePause = () => {
    setTimerState({
      isRunning: false,
      startTime: null,
      elapsedTime: timerState.elapsedTime,
    });
  };

  const handleStop = async () => {
    const totalHours = timerState.elapsedTime / 3600;
    const currentActualHours = task.actual_hours || 0;
    const newActualHours = currentActualHours + totalHours;

    await saveActualHours(newActualHours);

    // Reset timer
    setTimerState({
      isRunning: false,
      startTime: null,
      elapsedTime: 0,
    });
    localStorage.removeItem(storageKey);
  };

  const handleManualSave = async () => {
    const hours = parseFloat(manualHours);
    if (isNaN(hours) || hours < 0) {
      error('有効な時間を入力してください');
      return;
    }

    await saveActualHours(hours);
    setIsManualMode(false);
    setManualHours('');
  };

  const saveActualHours = async (hours: number) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actual_hours: Math.round(hours * 100) / 100, // Round to 2 decimal places
        }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        onUpdate(updatedTask);
        success('実績時間を保存しました');
      } else {
        error('実績時間の保存に失敗しました');
      }
    } catch (err) {
      console.error('Failed to save actual hours:', err);
      error('実績時間の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>時間トラッキング</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsManualMode(!isManualMode)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isManualMode ? (
          <>
            {/* Timer Display */}
            <div className="text-center">
              <div className="text-4xl font-mono font-bold mb-4">
                {formatTime(timerState.elapsedTime)}
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex justify-center gap-2">
              {!timerState.isRunning ? (
                <Button onClick={handleStart} className="gap-2">
                  <Play className="w-4 h-4" />
                  開始
                </Button>
              ) : (
                <Button onClick={handlePause} variant="secondary" className="gap-2">
                  <Pause className="w-4 h-4" />
                  一時停止
                </Button>
              )}
              <Button
                onClick={handleStop}
                variant="outline"
                className="gap-2"
                disabled={timerState.elapsedTime === 0 || saving}
              >
                <Square className="w-4 h-4" />
                {saving ? '保存中...' : '停止して保存'}
              </Button>
            </div>

            {/* Current Actual Hours */}
            {task.actual_hours !== undefined && task.actual_hours > 0 && (
              <div className="text-center text-sm text-muted-foreground">
                累計実績時間: {task.actual_hours.toFixed(2)}時間
              </div>
            )}
          </>
        ) : (
          <>
            {/* Manual Input Mode */}
            <div className="space-y-3">
              <Label htmlFor="manual-hours">実績時間を手動入力</Label>
              <Input
                id="manual-hours"
                type="number"
                min="0"
                step="0.1"
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
                placeholder="時間を入力（例: 2.5）"
              />
              <div className="flex gap-2">
                <Button onClick={handleManualSave} disabled={saving} className="flex-1">
                  {saving ? '保存中...' : '保存'}
                </Button>
                <Button
                  onClick={() => {
                    setIsManualMode(false);
                    setManualHours('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
