import {
  createTaskEstimationPrompt,
  createScheduleRecommendationPrompt,
  SYSTEM_PROMPTS,
} from '@/lib/services/ai-prompts';
import { TaskInput } from '@/lib/types';

const baseTask: TaskInput = {
  title: 'テストタスク',
  description: 'テストの説明',
  priority: 'must',
  category: '開発',
};

describe('createTaskEstimationPrompt', () => {
  it('タスク名がプロンプトに含まれる', () => {
    const result = createTaskEstimationPrompt(baseTask);
    expect(result).toContain('テストタスク');
  });

  it('説明がプロンプトに含まれる', () => {
    const result = createTaskEstimationPrompt(baseTask);
    expect(result).toContain('テストの説明');
  });

  it('説明がない場合は「なし」が表示される', () => {
    const task: TaskInput = { ...baseTask, description: undefined };
    const result = createTaskEstimationPrompt(task);
    expect(result).toContain('詳細: なし');
  });

  it('priority が must の場合「必須（今週中に完了）」が含まれる', () => {
    const result = createTaskEstimationPrompt({ ...baseTask, priority: 'must' });
    expect(result).toContain('必須（今週中に完了）');
  });

  it('priority が want の場合「希望（できれば今週中）」が含まれる', () => {
    const result = createTaskEstimationPrompt({ ...baseTask, priority: 'want' });
    expect(result).toContain('希望（できれば今週中）');
  });

  it('カテゴリがプロンプトに含まれる', () => {
    const result = createTaskEstimationPrompt(baseTask);
    expect(result).toContain('開発');
  });

  it('カテゴリがない場合は「なし」が表示される', () => {
    const task: TaskInput = { ...baseTask, category: undefined };
    const result = createTaskEstimationPrompt(task);
    expect(result).toContain('カテゴリ: なし');
  });

  it('JSON形式の必須フィールドが指示に含まれる', () => {
    const result = createTaskEstimationPrompt(baseTask);
    expect(result).toContain('estimated_hours');
    expect(result).toContain('confidence_score');
    expect(result).toContain('reasoning');
    expect(result).toContain('questions');
  });

  it('文字列を返す', () => {
    const result = createTaskEstimationPrompt(baseTask);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('createScheduleRecommendationPrompt', () => {
  const baseTasks = [
    {
      id: 1,
      title: 'タスクA',
      description: 'タスクAの説明',
      priority: 'must' as const,
      estimated_hours: 3,
    },
    {
      id: 2,
      title: 'タスクB',
      priority: 'want' as const,
      estimated_hours: 1.5,
    },
  ];

  it('タスクのタイトルがプロンプトに含まれる', () => {
    const result = createScheduleRecommendationPrompt(baseTasks);
    expect(result).toContain('タスクA');
    expect(result).toContain('タスクB');
  });

  it('priority が must の場合「必須」が含まれる', () => {
    const result = createScheduleRecommendationPrompt(baseTasks);
    expect(result).toContain('必須');
  });

  it('priority が want の場合「希望」が含まれる', () => {
    const result = createScheduleRecommendationPrompt(baseTasks);
    expect(result).toContain('希望');
  });

  it('estimated_hours がプロンプトに含まれる', () => {
    const result = createScheduleRecommendationPrompt(baseTasks);
    expect(result).toContain('3');
    expect(result).toContain('1.5');
  });

  it('estimated_hours がない場合「未見積もり」が含まれる', () => {
    const tasks = [{ id: 1, title: 'タスクC', priority: 'must' as const }];
    const result = createScheduleRecommendationPrompt(tasks);
    expect(result).toContain('未見積もり');
  });

  it('description がある場合プロンプトに含まれる', () => {
    const result = createScheduleRecommendationPrompt(baseTasks);
    expect(result).toContain('タスクAの説明');
  });

  it('空のタスクリストでも文字列を返す', () => {
    const result = createScheduleRecommendationPrompt([]);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('JSON形式の指示が含まれる', () => {
    const result = createScheduleRecommendationPrompt(baseTasks);
    expect(result).toContain('recommendations');
    expect(result).toContain('optimizations');
  });
});

describe('SYSTEM_PROMPTS', () => {
  it('TASK_ESTIMATION が定義されている', () => {
    expect(SYSTEM_PROMPTS.TASK_ESTIMATION).toBeDefined();
    expect(typeof SYSTEM_PROMPTS.TASK_ESTIMATION).toBe('string');
    expect(SYSTEM_PROMPTS.TASK_ESTIMATION.length).toBeGreaterThan(0);
  });

  it('SCHEDULE_OPTIMIZATION が定義されている', () => {
    expect(SYSTEM_PROMPTS.SCHEDULE_OPTIMIZATION).toBeDefined();
    expect(typeof SYSTEM_PROMPTS.SCHEDULE_OPTIMIZATION).toBe('string');
    expect(SYSTEM_PROMPTS.SCHEDULE_OPTIMIZATION.length).toBeGreaterThan(0);
  });

  it('TASK_ESTIMATION にプロジェクトマネージャーへの言及が含まれる', () => {
    expect(SYSTEM_PROMPTS.TASK_ESTIMATION).toContain('プロジェクトマネージャー');
  });

  it('SCHEDULE_OPTIMIZATION にスケジュール管理への言及が含まれる', () => {
    expect(SYSTEM_PROMPTS.SCHEDULE_OPTIMIZATION).toContain('スケジュール');
  });
});
