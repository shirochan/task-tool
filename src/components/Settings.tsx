'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Plus, Edit, Trash2, Save, X, Download, Upload } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomCategory, CustomCategoryInput } from '@/lib/types';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const { theme, setTheme } = useTheme();
  const [workStartTime, setWorkStartTime] = useState('10:00');
  const [workEndTime, setWorkEndTime] = useState('19:00');
  const [dailyWorkHours, setDailyWorkHours] = useState(8);
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [newCategory, setNewCategory] = useState<CustomCategoryInput>({ name: '', color: '#3b82f6' });
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const settings = await response.json();
        
        // 設定値を画面に反映
        settings.forEach((setting: { setting_key: string; value: string }) => {
          switch (setting.setting_key) {
            case 'work_start_time':
              setWorkStartTime(setting.value);
              break;
            case 'work_end_time':
              setWorkEndTime(setting.value);
              break;
            case 'daily_work_hours':
              setDailyWorkHours(parseFloat(setting.value));
              break;
          }
        });
      }
    } catch (error) {
      console.error('設定の取得に失敗しました:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('カテゴリの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ setting_key: key, value }),
      });
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
    }
  };

  const handleSaveSettings = async () => {
    await Promise.all([
      saveSetting('work_start_time', workStartTime),
      saveSetting('work_end_time', workEndTime),
      saveSetting('daily_work_hours', dailyWorkHours.toString()),
    ]);
    
    alert('設定を保存しました');
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return;

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });

      if (response.ok) {
        const category = await response.json();
        setCategories([...categories, category]);
        setNewCategory({ name: '', color: '#3b82f6' });
      }
    } catch (error) {
      console.error('カテゴリの作成に失敗しました:', error);
    }
  };

  const handleUpdateCategory = async (id: number, categoryData: CustomCategoryInput) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      if (response.ok) {
        const updatedCategory = await response.json();
        setCategories(categories.map(cat => 
          cat.id === id ? updatedCategory : cat
        ));
        setEditingCategory(null);
      }
    } catch (error) {
      console.error('カテゴリの更新に失敗しました:', error);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('このカテゴリを削除しますか？')) return;

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCategories(categories.filter(cat => cat.id !== id));
      }
    } catch (error) {
      console.error('カテゴリの削除に失敗しました:', error);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/backup');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `task-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert('データのエクスポートが完了しました');
      }
    } catch (error) {
      console.error('データのエクスポートに失敗しました:', error);
      alert('データのエクスポートに失敗しました');
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      
      if (!confirm('既存のデータに追加してバックアップデータを復元しますか？')) {
        return;
      }

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backupData),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`復元が完了しました: タスク${result.restored.tasks}件、設定${result.restored.settings}件、カテゴリ${result.restored.categories}件`);
        
        // 画面を更新
        fetchSettings();
        fetchCategories();
      } else {
        throw new Error('復元に失敗しました');
      }
    } catch (error) {
      console.error('データの復元に失敗しました:', error);
      alert('データの復元に失敗しました');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            設定
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* 表示設定 */}
          <Card>
            <CardHeader>
              <CardTitle>表示設定</CardTitle>
              <CardDescription>
                アプリケーションの表示に関する設定です
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="theme">テーマ</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue placeholder="テーマを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">システム設定に従う</SelectItem>
                    <SelectItem value="light">ライトモード</SelectItem>
                    <SelectItem value="dark">ダークモード</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 作業時間設定 */}
          <Card>
            <CardHeader>
              <CardTitle>作業時間設定</CardTitle>
              <CardDescription>
                スケジュール生成時に使用する作業時間を設定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="work-start-time">開始時刻</Label>
                  <Input
                    id="work-start-time"
                    type="time"
                    value={workStartTime}
                    onChange={(e) => setWorkStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="work-end-time">終了時刻</Label>
                  <Input
                    id="work-end-time"
                    type="time"
                    value={workEndTime}
                    onChange={(e) => setWorkEndTime(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="daily-work-hours">1日の作業時間（時間）</Label>
                <Input
                  id="daily-work-hours"
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={dailyWorkHours}
                  onChange={(e) => setDailyWorkHours(parseFloat(e.target.value))}
                />
              </div>
              <Button onClick={handleSaveSettings} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                作業時間設定を保存
              </Button>
            </CardContent>
          </Card>

          {/* カテゴリ管理 */}
          <Card>
            <CardHeader>
              <CardTitle>カテゴリ管理</CardTitle>
              <CardDescription>
                タスクで使用するカテゴリを管理します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 新規カテゴリ作成 */}
              <div className="flex gap-2">
                <Input
                  placeholder="新しいカテゴリ名"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                />
                <Input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  className="w-20"
                />
                <Button onClick={handleCreateCategory}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* 既存カテゴリ一覧 */}
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 border rounded">
                    {editingCategory?.id === category.id ? (
                      <div className="flex gap-2 flex-1">
                        <Input
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        />
                        <Input
                          type="color"
                          value={editingCategory.color}
                          onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                          className="w-20"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdateCategory(category.id, {
                            name: editingCategory.name,
                            color: editingCategory.color
                          })}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingCategory(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCategory(category)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* データ管理 */}
          <Card>
            <CardHeader>
              <CardTitle>データ管理</CardTitle>
              <CardDescription>
                データのバックアップ・復元を行います
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={handleExportData} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  データをエクスポート
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  データをインポート
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
              <div className="text-sm text-gray-600">
                <p>• エクスポートしたJSONファイルには、タスク、設定、カテゴリ、スケジュールが含まれます</p>
                <p>• インポート時は既存のデータに追加されます</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}