import { TaskInput } from '@/lib/types';

export function createTaskEstimationPrompt(task: TaskInput): string {
  return `以下のタスクについて、作業時間を推定してください。

タスク名: ${task.title}
詳細: ${task.description || 'なし'}
優先度: ${task.priority === 'must' ? '必須（今週中に完了）' : '希望（できれば今週中）'}
カテゴリ: ${task.category || 'なし'}

必ず以下の正確なJSON形式で回答してください：
{
  "estimated_hours": 2.5,
  "confidence_score": 0.8,
  "reasoning": "推定理由の詳細説明",
  "questions": ["質問1", "質問2"]
}

重要な指示：
- estimated_hours: 0.5時間単位の正の数値（例: 1.0, 2.5, 4.0）
- confidence_score: 0.0から1.0の間の数値（例: 0.7）
- reasoning: 推定理由の文字列（必須）
- questions: 質問の配列（空配列でも可）

推定する際の考慮事項：
- 一般的な作業者のスキルレベルを想定
- 準備時間、実行時間、確認時間を含める
- 複雑さ、必要なスキル、外部依存性を考慮
- 不明な点があれば質問を含める
- 現実的で実行可能な時間を提示

JSON以外の説明文は一切含めず、上記の形式のJSONのみで回答してください。`;
}

export function createScheduleRecommendationPrompt(tasks: Array<{
  id: number;
  title: string;
  description?: string;
  priority: 'must' | 'want';
  estimated_hours?: number;
}>): string {
  const tasksDescription = tasks.map(task => 
    `- ${task.title} (${task.priority === 'must' ? '必須' : '希望'}, ${task.estimated_hours || '未見積もり'}時間): ${task.description || ''}`
  ).join('\n');

  return `
以下のタスクリストに基づいて、週間スケジュールの推奨事項を提案してください：

${tasksDescription}

以下の形式でJSONで回答してください：
{
  "recommendations": [
    "スケジュール作成のための推奨事項1",
    "推奨事項2"
  ],
  "optimizations": [
    "効率化のための提案1",
    "提案2"
  ]
}

考慮すべき点：
- 優先度の高いタスクを先に配置
- 作業時間の合計が週40時間を超えないように調整
- 関連するタスクをグループ化
- エネルギーレベルに応じた時間配分
- バッファ時間の確保

JSON形式のみで回答してください。
`;
}

export const SYSTEM_PROMPTS = {
  TASK_ESTIMATION: 'あなたは経験豊富なプロジェクトマネージャーです。タスクの工数見積もりを正確に行います。指定されたJSON形式で必ず回答してください。',
  SCHEDULE_OPTIMIZATION: 'あなたは効率的なスケジュール管理の専門家です。実践的で実行可能な提案を行います。'
} as const;