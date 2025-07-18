import OpenAI from 'openai';
import { EstimateRequest, EstimateResponse, ConsultationRequest, ConsultationResponse } from '@/lib/types';

// 定数定義
const TASK_PRIORITY_LABELS = {
  must: '必須（今週中に完了）',
  want: '希望（できれば今週中）'
} as const;

const TASK_PRIORITY_SHORT_LABELS = {
  must: '必須',
  want: '希望'
} as const;

const DEFAULT_MESSAGES = {
  AI_ESTIMATION_FAILED: 'AI推定',
  PARSE_ERROR_REASON: 'AI応答の解析に失敗したため、デフォルト値を使用',
  CONSULTATION_FAILED: 'AI相談の処理に失敗しました',
  ANALYSIS_FAILED: '応答の解析に失敗しました',
  RECOMMENDATION_FAILED: 'AI推奨事項の取得に失敗しました'
} as const;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }
  
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export class AIService {
  static async estimateTask(request: EstimateRequest): Promise<EstimateResponse> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const { task } = request;
    
    const prompt = `
タスクの見積もりをお願いします。以下のタスクについて、作業時間を推定してください。

タスク名: ${task.title}
詳細: ${task.description || 'なし'}
優先度: ${TASK_PRIORITY_LABELS[task.priority]}
カテゴリ: ${task.category || 'なし'}

以下の形式でJSONで回答してください：
{
  "estimated_hours": 推定時間（数値、0.5時間単位）,
  "confidence_score": 信頼度（0.0〜1.0）,
  "reasoning": "推定理由の説明",
  "questions": ["より正確な見積もりのための質問1", "質問2"]
}

推定する際の考慮事項：
- 一般的な作業者のスキルレベルを想定
- 準備時間、実行時間、確認時間を含める
- 複雑さ、必要なスキル、外部依存性を考慮
- 不明な点があれば質問を含める
- 現実的で実行可能な時間を提示

JSON形式のみで回答してください。
`;

    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'あなたは経験豊富なプロジェクトマネージャーです。タスクの工数見積もりを正確に行います。必ず有効なJSON形式のみで回答してください。マークダウンのコードブロックは使用しないでください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('OpenAI API returned empty response');
      }

      try {
        // JSONブロックを抽出（```jsonで囲まれている場合）
        let jsonText = response;
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }
        
        const parsed = JSON.parse(jsonText);
        
        // 必要なフィールドが存在するか確認
        if (typeof parsed.estimated_hours !== 'number' || parsed.estimated_hours <= 0) {
          console.warn('Invalid estimated_hours in OpenAI response, using default');
          parsed.estimated_hours = 2;
        }
        
        // 上限チェック: 非現実的な見積もりを防ぐ
        if (parsed.estimated_hours > 1000) {
          console.warn(`Unrealistic estimated_hours (${parsed.estimated_hours}), capping at 1000`);
          parsed.estimated_hours = 1000;
        }
        
        return {
          estimated_hours: parsed.estimated_hours,
          hours: parsed.estimated_hours, // 下位互換性のため
          confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0.5,
          reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : DEFAULT_MESSAGES.AI_ESTIMATION_FAILED,
          questions: Array.isArray(parsed.questions) ? parsed.questions : [],
        };
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', response);
        console.error('Parse error:', parseError);
        
        // パースエラーの場合はフォールバック値を返す
        return {
          estimated_hours: 2,
          hours: 2,
          confidence_score: 0.5,
          reasoning: DEFAULT_MESSAGES.PARSE_ERROR_REASON,
          questions: ['より詳細な情報を提供していただけますか？'],
        };
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('AI見積もりの取得に失敗しました');
    }
  }

  static async generateScheduleRecommendations(tasks: Array<{
    id: number;
    title: string;
    description?: string;
    priority: 'must' | 'want';
    estimated_hours?: number;
  }>): Promise<{
    recommendations: string[];
    optimizations: string[];
  }> {
    if (!process.env.OPENAI_API_KEY) {
      return {
        recommendations: ['OpenAI APIキーが設定されていません'],
        optimizations: [],
      };
    }

    const tasksDescription = tasks.map(task => 
      `- ${task.title} (${TASK_PRIORITY_SHORT_LABELS[task.priority]}, ${task.estimated_hours || '未見積もり'}時間): ${task.description || ''}`
    ).join('\n');

    const prompt = `
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

    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたは効率的なスケジュール管理の専門家です。実践的で実行可能な提案を行います。必ず有効なJSON形式のみで回答してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 400,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        return {
          recommendations: ['AI応答を取得できませんでした'],
          optimizations: [],
        };
      }

      try {
        // JSONブロックを抽出（```jsonで囲まれている場合）
        let jsonText = response;
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }
        
        const parsed = JSON.parse(jsonText);
        return {
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['推奨事項を生成できませんでした'],
          optimizations: Array.isArray(parsed.optimizations) ? parsed.optimizations : [],
        };
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', response);
        console.error('Parse error:', parseError);
        return {
          recommendations: [DEFAULT_MESSAGES.ANALYSIS_FAILED],
          optimizations: [],
        };
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      return {
        recommendations: [DEFAULT_MESSAGES.RECOMMENDATION_FAILED],
        optimizations: [],
      };
    }
  }

  static async consultWithAI(request: ConsultationRequest): Promise<ConsultationResponse> {
    if (!process.env.OPENAI_API_KEY) {
      return generateMockConsultation(request);
    }

    const { message, context, consultation_type = 'general' } = request;

    // 会話履歴を含めたコンテキストを構築
    const conversationHistory = context?.conversation_history || [];
    const currentTasks = context?.current_tasks || [];
    
    const tasksContext = currentTasks.length > 0 
      ? `\n現在のタスク:\n${currentTasks.map(task => 
          `- ${task.title} (${TASK_PRIORITY_SHORT_LABELS[task.priority]}, ${task.estimated_hours || '未見積もり'}時間): ${task.description || ''}`
        ).join('\n')}`
      : '';

    const historyContext = conversationHistory.length > 0
      ? `\n会話履歴:\n${conversationHistory.slice(-3).map(msg => 
          `${msg.type === 'user' ? 'ユーザー' : 'AI'}: ${msg.content}`
        ).join('\n')}`
      : '';

    const systemPrompt = getSystemPromptForConsultationType(consultation_type);

    const prompt = `
ユーザーからの相談: ${message}
${tasksContext}
${historyContext}

以下の形式でJSONで回答してください：
{
  "message": "相談への回答",
  "suggestions": ["具体的な提案1", "提案2"],
  "follow_up_questions": ["追加で聞きたい質問1", "質問2"],
  "confidence_score": 信頼度（0.0〜1.0）,
  "consultation_type": "相談タイプ",
  "metadata": {
    "recommended_actions": ["推奨アクション1", "アクション2"],
    "priority_level": "high|medium|low"
  }
}

回答する際の考慮事項：
- 実践的で実行可能なアドバイスを提供
- ユーザーの現在のタスクと優先度を考慮
- 具体的な改善提案を含める
- 必要に応じて追加情報を求める質問を含める
- 日本語で親しみやすい口調で回答

JSON形式のみで回答してください。
`;

    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt + '\n\n必ず有効なJSON形式のみで回答してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        return generateMockConsultation(request);
      }

      try {
        // JSONブロックを抽出（```jsonで囲まれている場合）
        let jsonText = response;
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }
        
        const parsed = JSON.parse(jsonText);
        return {
          message: typeof parsed.message === 'string' ? parsed.message : 'AI応答を取得できませんでした',
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
          follow_up_questions: Array.isArray(parsed.follow_up_questions) ? parsed.follow_up_questions : [],
          confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0.7,
          consultation_type: typeof parsed.consultation_type === 'string' ? parsed.consultation_type : consultation_type,
          metadata: typeof parsed.metadata === 'object' && parsed.metadata !== null ? parsed.metadata : {},
        };
      } catch (parseError) {
        console.error('Failed to parse OpenAI consultation response:', response);
        console.error('Parse error:', parseError);
        return generateMockConsultation(request);
      }
    } catch (error) {
      console.error('OpenAI API error during consultation:', error);
      return generateMockConsultation(request);
    }
  }
}

function getSystemPromptForConsultationType(type: string): string {
  const basePersonality = `
あなたは親しみやすく、共感力のあるAIアシスタントです。以下の特徴を持って対話してください：

・相手の気持ちに寄り添う温かい口調で話す
・専門的すぎず、親しみやすい言葉遣いを使う
・具体的で実践的なアドバイスを提供する
・相手の状況を理解し、個別性を重視する
・励ましや共感の言葉を適切に使う
・「〜ですね」「〜かもしれませんね」など、自然な日本語表現を使う
・相手の立場に立って考える

回答は以下の構成で行ってください：
1. 相手の状況への共感・理解
2. 具体的で実践的なアドバイス
3. 励ましや前向きなメッセージ
4. 必要に応じて追加の質問や提案
`;

  switch (type) {
    case 'task_planning':
      return basePersonality + `
専門分野：タスク計画と優先順位付け
・プロジェクトの全体像を見据えたアドバイス
・実現可能なスケジュールの提案
・リスク管理の観点も含める
・チームワークや協業の視点も考慮する`;

    case 'time_management':
      return basePersonality + `
専門分野：時間管理とワークライフバランス
・個人の生活リズムを考慮したアドバイス
・持続可能な時間管理方法の提案
・ストレス管理の観点も含める
・仕事と私生活のバランスを重視する`;

    case 'productivity':
      return basePersonality + `
専門分野：生産性向上と効率化
・個人のワークスタイルに合わせた提案
・ツールや手法の具体的な活用方法
・習慣化のためのステップバイステップなアドバイス
・燃え尽き症候群を防ぐ観点も含める`;

    default:
      return basePersonality + `
・幅広いトピックに対応できる総合的な知識
・相手の興味や関心に合わせた対話
・学習や成長を支援する姿勢
・困った時の相談相手として信頼される対応`;
  }
}

function generateMockConsultation(request: ConsultationRequest): ConsultationResponse {
  const { message, consultation_type = 'general' } = request;
  
  // キーワードベースの簡単な応答生成
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('時間') || lowerMessage.includes('スケジュール')) {
    return {
      message: '時間管理でお悩みなんですね。毎日やることがたくさんあって、どう整理すればいいか迷ってしまいますよね。\n\nまずは今抱えているタスクを一度整理してみませんか？優先度の高いものから順番に取り組むことで、気持ちも楽になると思います。朝の頭がスッキリしている時間帯に重要なタスクを配置するのもおすすめですよ。\n\n無理をせず、自分のペースを大切にしながら進めていきましょう！',
      suggestions: [
        '朝の集中力の高い時間に重要なタスクを配置してみる',
        '似たようなタスクをまとめて処理する（例：メール返信は決まった時間に）',
        '1日8時間以内を目安に、無理のないスケジュールを組む'
      ],
      follow_up_questions: [
        '今一番時間を取られているのはどんなタスクですか？',
        '普段、どの時間帯が一番集中できると感じますか？'
      ],
      confidence_score: 0.8,
      consultation_type: 'time_management',
      metadata: {
        recommended_actions: ['タスクの優先順位を見直す', '時間ブロッキングを導入する'],
        priority_level: 'high'
      }
    };
  }
  
  if (lowerMessage.includes('生産性') || lowerMessage.includes('効率')) {
    return {
      message: '生産性を上げたいと思われているんですね。なんだかやることが多くて効率が悪いなと感じる時、ありますよね。\n\n今の作業の流れを一度振り返ってみませんか？意外と小さな改善で大きく変わることがあるんです。例えば、集中できる環境を整えたり、25分集中して5分休憩するポモドーロテクニックを試してみたり。\n\n完璧を目指さず、まずは一つずつ試してみることが大切だと思います。きっと自分に合った方法が見つかりますよ！',
      suggestions: [
        '作業中の邪魔をできるだけ減らす環境を作ってみる',
        'ポモドーロテクニック（25分集中→5分休憩）を試してみる',
        '疲れを感じる前に小まめに休憩を取る習慣をつける'
      ],
      follow_up_questions: [
        '今の作業で、どの部分に一番時間がかかっていますか？',
        '作業中によく邪魔が入ったり、集中が途切れたりすることはありますか？'
      ],
      confidence_score: 0.8,
      consultation_type: 'productivity',
      metadata: {
        recommended_actions: ['作業環境を整える', '集中時間を確保する'],
        priority_level: 'medium'
      }
    };
  }
  
  // 一般的な相談応答
  return {
    message: 'お疲れ様です。何かお困りのことがあるんですね。\n\nどんな小さなことでも構いませんので、もう少し詳しく教えていただけますか？一緒に考えさせていただきますよ。\n\n一人で抱え込まず、お気軽にご相談くださいね。',
    suggestions: [
      'まずは今の状況を整理してみる',
      '抱えている問題を一つずつ書き出してみる',
      '小さな一歩から始めてみる'
    ],
    follow_up_questions: [
      'どのようなことでお困りですか？',
      '理想的にはどんな状況になりたいですか？'
    ],
    confidence_score: 0.6,
    consultation_type: consultation_type,
    metadata: {
      recommended_actions: ['現状分析', '目標設定'],
      priority_level: 'medium'
    }
  };
}