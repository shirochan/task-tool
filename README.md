# タスク管理ツール

AI搭載のタスク管理と週間スケジュール作成ツールです。

## 主な機能

### ✅ タスク管理
- タスクの作成、編集、削除
- 優先度設定（必須/希望）
- カテゴリ分類
- 詳細説明の記録

### 🤖 AI見積もり機能
- OpenAI GPT-4を使用した作業時間の自動推定
- タスクの複雑さに基づいた信頼度スコア
- 不足情報の自動質問生成
- フォールバック機能（APIが利用できない場合はモック見積もり）

### 📅 週間スケジュール可視化
- 月曜日から金曜日までの自動タスク割り振り
- 優先度に基づいた最適なスケジューリング
- 1日8時間の作業時間制限
- ドラッグ＆ドロップでの調整（将来実装予定）

### 📱 レスポンシブデザイン
- モバイル、タブレット、デスクトップ対応
- Tailwind CSSによる美しいUI
- shadcn/uiコンポーネント使用

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router) + TypeScript
- **スタイリング**: Tailwind CSS + shadcn/ui
- **データベース**: SQLite (better-sqlite3)
- **AI統合**: OpenAI GPT-4 API
- **フォーム管理**: React Hook Form + Zod
- **状態管理**: React Hooks

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下を設定：

```bash
# OpenAI API Configuration (オプション)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**注意**: OpenAI APIキーがない場合でも、モック見積もり機能が利用できます。

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開いてアプリケーションにアクセスできます。

## 使用方法

### 1. タスクの作成
1. 「新規タスク」ボタンをクリック
2. タスクの詳細を入力
3. 「AI見積もり」ボタンで作業時間を自動推定
4. 「作成」ボタンで保存

### 2. 週間スケジュールの生成
1. 「週間スケジュール」タブに移動
2. 「スケジュール生成」ボタンをクリック
3. 自動的にタスクが月〜金に割り振られます

### 3. タスクの管理
- 編集アイコンでタスクを更新
- ゴミ箱アイコンでタスクを削除
- 優先度や進行状況を確認

## API エンドポイント

### タスク管理
- `GET /api/tasks` - 全タスク取得
- `POST /api/tasks` - タスク作成
- `GET /api/tasks/[id]` - 特定タスク取得
- `PUT /api/tasks/[id]` - タスク更新
- `DELETE /api/tasks/[id]` - タスク削除

### AI見積もり
- `POST /api/estimate` - タスクの作業時間見積もり

### スケジュール
- `GET /api/schedule` - 週間スケジュール取得
- `POST /api/schedule/generate` - スケジュール生成

## ビルドとデプロイ

### 本番ビルド
```bash
npm run build
```

### ビルドの確認
```bash
npm start
```

---

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
