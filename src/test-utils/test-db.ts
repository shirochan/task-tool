import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';

let testDb: Database.Database | null = null;

/**
 * テスト用のin-memoryデータベースを作成・取得
 */
export function getTestDatabase(): Database.Database {
  if (!testDb) {
    testDb = new Database(':memory:');
    
    // スキーマファイルを読み込んで実行
    const schemaPath = path.join(process.cwd(), 'src', 'lib', 'database', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    // スキーマを実行
    testDb.exec(schema);
  }
  
  return testDb;
}

/**
 * テストデータベースをクリーンアップ
 */
export function cleanupTestDatabase(): void {
  if (testDb) {
    const tables = ['tasks', 'task_schedules', 'ai_estimates', 'user_settings', 'custom_categories'];
    
    tables.forEach(table => {
      testDb!.exec(`DELETE FROM ${table}`);
    });
  }
}

/**
 * テストデータベースを閉じる
 */
export function closeTestDatabase(): void {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}

/**
 * テスト用のプリペアドステートメント
 * 実際のdb.tsのstatementsと同じ構造
 */
export function getTestStatements(db: Database.Database) {
  return {
    insertTask: db.prepare(`
      INSERT INTO tasks (title, description, priority, category, estimated_hours, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    
    getTaskById: db.prepare(`
      SELECT * FROM tasks WHERE id = ?
    `),
    
    getAllTasks: db.prepare(`
      SELECT * FROM tasks ORDER BY created_at DESC
    `),
    
    updateTask: db.prepare(`
      UPDATE tasks 
      SET title = ?, description = ?, priority = ?, category = ?, estimated_hours = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
    
    deleteTask: db.prepare(`
      DELETE FROM tasks WHERE id = ?
    `),
    
    insertTaskSchedule: db.prepare(`
      INSERT INTO task_schedules (task_id, day_of_week, start_time, end_time, scheduled_date)
      VALUES (?, ?, ?, ?, ?)
    `),
    
    getScheduleByDate: db.prepare(`
      SELECT ts.*, t.title, t.description, t.priority, t.category, t.estimated_hours, t.actual_hours, t.status, t.updated_at
      FROM task_schedules ts
      JOIN tasks t ON ts.task_id = t.id
      WHERE ts.scheduled_date = ?
      ORDER BY ts.start_time
    `),
    
    deleteTaskSchedule: db.prepare(`
      DELETE FROM task_schedules WHERE task_id = ?
    `),
    
    clearWeeklySchedule: db.prepare(`
      DELETE FROM task_schedules 
      WHERE scheduled_date BETWEEN ? AND ?
    `),
    
    insertAiEstimate: db.prepare(`
      INSERT INTO ai_estimates (task_id, estimated_hours, confidence_score, reasoning, questions_asked)
      VALUES (?, ?, ?, ?, ?)
    `),
    
    insertUserSetting: db.prepare(`
      INSERT OR REPLACE INTO user_settings (setting_key, value)
      VALUES (?, ?)
    `),
    
    getUserSetting: db.prepare(`
      SELECT value FROM user_settings WHERE setting_key = ?
    `),
  };
}