-- タスク管理ツール用データベーススキーマ

-- タスクテーブル
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL CHECK (priority IN ('must', 'want')),
    category TEXT,
    estimated_hours REAL,
    actual_hours REAL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'on_hold', 'review', 'completed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 週間スケジュールテーブル
CREATE TABLE IF NOT EXISTS task_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- 1=月曜, 5=金曜
    start_time TIME,
    end_time TIME,
    scheduled_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- AI見積もり履歴テーブル
CREATE TABLE IF NOT EXISTS ai_estimates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    estimated_hours REAL NOT NULL,
    confidence_score REAL,
    reasoning TEXT,
    questions_asked TEXT, -- JSON形式で追加質問を保存
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ユーザー設定テーブル
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- カスタムカテゴリテーブル
CREATE TABLE IF NOT EXISTS custom_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3b82f6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI相談履歴テーブル
CREATE TABLE IF NOT EXISTS consultation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('user', 'ai')),
    content TEXT NOT NULL,
    consultation_type TEXT DEFAULT 'general',
    confidence_score REAL,
    metadata TEXT, -- JSON形式でメタデータを保存
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_schedules_day ON task_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_task_schedules_date ON task_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_custom_categories_name ON custom_categories(name);
CREATE INDEX IF NOT EXISTS idx_consultation_session ON consultation_history(session_id);
CREATE INDEX IF NOT EXISTS idx_consultation_type ON consultation_history(consultation_type);