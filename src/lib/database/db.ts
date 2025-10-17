import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { dbLogger } from '@/lib/logger';

// データベースファイルパス（テスト環境では:memory:を使用）
const dbPath = process.env.NODE_ENV === 'test' ? ':memory:' : path.join(process.cwd(), 'data', 'tasks.db');

// SQLiteデータベース接続（遅延初期化）
let db: Database.Database | null = null;

function getDatabase(): Database.Database {
  if (!db) {
    // 本番環境のみディレクトリ作成
    if (dbPath !== ':memory:') {
      const dataDir = path.dirname(dbPath);
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }
    }
    
    db = new Database(dbPath);
    
    // スキーマファイルを読み込んで実行
    const schemaPath = path.join(process.cwd(), 'src', 'lib', 'database', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    // スキーマを実行
    db.exec(schema);
    
    dbLogger.info({ 
      dbPath: dbPath === ':memory:' ? ':memory:' : 'data/tasks.db',
      environment: process.env.NODE_ENV 
    }, 'Database initialized successfully');
  }
  
  return db;
}

// データベース初期化
export function initializeDatabase() {
  getDatabase();
}

// テスト用: データベースクリーンアップ関数
export function cleanupDatabase() {
  if (db) {
    const tables = ['tasks', 'task_schedules', 'ai_estimates', 'user_settings', 'custom_categories'];
    tables.forEach(table => {
      db!.exec(`DELETE FROM ${table}`);
    });
  }
}

// テスト用: データベース接続を閉じる
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

// データベース接続のプリペアドステートメント（遅延初期化）
export const statements = {
  get insertTask() {
    return getDatabase().prepare(`
      INSERT INTO tasks (title, description, priority, category, estimated_hours, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
  },
  
  get getTaskById() {
    return getDatabase().prepare(`
      SELECT * FROM tasks WHERE id = ?
    `);
  },
  
  get getAllTasks() {
    return getDatabase().prepare(`
      SELECT * FROM tasks ORDER BY priority DESC, created_at DESC
    `);
  },
  
  get updateTask() {
    return getDatabase().prepare(`
      UPDATE tasks
      SET title = ?, description = ?, priority = ?, category = ?, estimated_hours = ?, actual_hours = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
  },
  
  get deleteTask() {
    return getDatabase().prepare(`
      DELETE FROM tasks WHERE id = ?
    `);
  },
  
  // スケジュール関連
  get insertTaskSchedule() {
    return getDatabase().prepare(`
      INSERT INTO task_schedules (task_id, day_of_week, start_time, end_time, scheduled_date)
      VALUES (?, ?, ?, ?, ?)
    `);
  },
  
  get getScheduleByDate() {
    return getDatabase().prepare(`
      SELECT 
        ts.id,
        ts.task_id,
        ts.day_of_week,
        ts.start_time,
        ts.end_time,
        ts.scheduled_date,
        ts.created_at as schedule_created_at,
        t.title,
        t.description,
        t.priority,
        t.category,
        t.estimated_hours,
        t.actual_hours,
        t.status,
        t.created_at,
        t.updated_at
      FROM task_schedules ts
      JOIN tasks t ON ts.task_id = t.id
      WHERE ts.scheduled_date = ?
      ORDER BY ts.start_time
    `);
  },
  
  get getWeeklySchedule() {
    return getDatabase().prepare(`
      SELECT 
        ts.id,
        ts.task_id,
        ts.day_of_week,
        ts.start_time,
        ts.end_time,
        ts.scheduled_date,
        ts.created_at as schedule_created_at,
        t.title,
        t.description,
        t.priority,
        t.category,
        t.estimated_hours,
        t.actual_hours,
        t.status,
        t.created_at,
        t.updated_at
      FROM task_schedules ts
      JOIN tasks t ON ts.task_id = t.id
      WHERE ts.scheduled_date BETWEEN ? AND ?
      ORDER BY ts.day_of_week, ts.start_time
    `);
  },
  
  // AI見積もり関連
  get insertAIEstimate() {
    return getDatabase().prepare(`
      INSERT INTO ai_estimates (task_id, estimated_hours, confidence_score, reasoning, questions_asked)
      VALUES (?, ?, ?, ?, ?)
    `);
  },
  
  get getLatestEstimate() {
    return getDatabase().prepare(`
      SELECT * FROM ai_estimates 
      WHERE task_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
  },

  // 週間スケジュールクリア
  get clearWeeklySchedule() {
    return getDatabase().prepare(`
      DELETE FROM task_schedules 
      WHERE scheduled_date BETWEEN ? AND ?
    `);
  },

  // 個別タスクのスケジュール削除
  get deleteTaskSchedule() {
    return getDatabase().prepare(`
      DELETE FROM task_schedules 
      WHERE task_id = ?
    `);
  },

  // 個別スケジュールの更新
  get updateTaskSchedule() {
    return getDatabase().prepare(`
      UPDATE task_schedules 
      SET start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          scheduled_date = COALESCE(?, scheduled_date)
      WHERE id = ?
    `);
  },

  // ユーザー設定関連
  get getAllSettings() {
    return getDatabase().prepare(`
      SELECT * FROM user_settings ORDER BY setting_key
    `);
  },

  get getSetting() {
    return getDatabase().prepare(`
      SELECT * FROM user_settings WHERE setting_key = ?
    `);
  },

  get upsertSetting() {
    return getDatabase().prepare(`
      INSERT INTO user_settings (setting_key, value) 
      VALUES (?, ?) 
      ON CONFLICT(setting_key) DO UPDATE SET 
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);
  },

  get deleteSetting() {
    return getDatabase().prepare(`
      DELETE FROM user_settings WHERE setting_key = ?
    `);
  },

  // カスタムカテゴリ関連
  get getAllCategories() {
    return getDatabase().prepare(`
      SELECT * FROM custom_categories ORDER BY name
    `);
  },

  get getCategoryById() {
    return getDatabase().prepare(`
      SELECT * FROM custom_categories WHERE id = ?
    `);
  },

  get insertCategory() {
    return getDatabase().prepare(`
      INSERT INTO custom_categories (name, color)
      VALUES (?, ?)
    `);
  },

  get updateCategory() {
    return getDatabase().prepare(`
      UPDATE custom_categories 
      SET name = ?, color = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
  },

  get deleteCategory() {
    return getDatabase().prepare(`
      DELETE FROM custom_categories WHERE id = ?
    `);
  }
};

// トランザクション処理
export function runTransaction<T>(callback: (db: Database.Database) => T): T {
  const database = getDatabase();
  const transaction = database.transaction(callback);
  return transaction(database);
}

