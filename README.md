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

### ⚙️ 設定管理機能
- 作業時間設定（開始時刻・終了時刻・1日の作業時間）
- カスタムカテゴリ管理（作成・編集・削除・色設定）
- データバックアップ・エクスポート機能（JSON形式）
- 設定の永続化とインポート・エクスポート

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
- **テスト**: Jest + React Testing Library
- **CI/CD**: GitHub Actions
- **コード品質**: ESLint + TypeScript + Codecov

## セットアップ

### 通常の開発環境

#### 1. 依存関係のインストール

```bash
npm install
```

#### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下を設定：

```bash
# OpenAI API Configuration (オプション)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**注意**: OpenAI APIキーがない場合でも、モック見積もり機能が利用できます。

#### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開いてアプリケーションにアクセスできます。

### Docker環境での実行

#### 1. 本番環境での実行

```bash
# イメージのビルド
docker compose build

# コンテナの起動
docker compose up -d

# ログの確認
docker compose logs -f

# コンテナの停止
docker compose down
```

#### 2. 開発環境での実行

```bash
# 開発モードでの起動（ホットリロード有効）
docker compose --profile dev up -d app-dev

# ログの確認
docker compose logs -f app-dev

# コンテナの停止
docker compose down
```

#### 3. 環境変数の設定

Docker環境で使用する場合、`.env.local`ファイルを作成してください：

```bash
# OpenAI API Configuration (オプション)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

#### 4. データの永続化

- SQLiteデータベースは `./data/tasks.db` に保存されます
- Dockerコンテナを再起動してもデータは保持されます

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

### 4. 設定の変更
1. 右上の設定アイコンをクリック
2. 作業時間設定で個人のスケジュールに合わせて調整
3. カスタムカテゴリを作成・管理
4. データのバックアップ・復元が可能

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
- `PUT /api/schedule/[id]` - スケジュール更新
- `PUT /api/schedule/move` - タスクの移動

### 設定管理
- `GET /api/settings` - 設定取得
- `POST /api/settings` - 設定保存

### カテゴリ管理
- `GET /api/categories` - カテゴリ取得
- `POST /api/categories` - カテゴリ作成
- `PUT /api/categories/[id]` - カテゴリ更新
- `DELETE /api/categories/[id]` - カテゴリ削除

### データ管理
- `GET /api/backup` - データエクスポート
- `POST /api/backup` - データインポート

## ビルドとデプロイ

### 本番ビルド
```bash
npm run build
```

### ビルドの確認
```bash
npm start
```

## テスト

### テストの実行

```bash
# 全てのテストを実行
npm test

# カバレッジ付きでテストを実行
npm run test:coverage

# ウォッチモードでテストを実行
npm run test:watch

# CI環境でのテスト実行
npm run test:ci
```

### テストの構成

#### 包括的テスト環境（184+ テスト実装）

- **API エンドポイントテスト** (14 テスト)
  - `/api/tasks` - タスクCRUD操作の完全テスト
  - `/api/estimate` - AI見積もり機能のテスト（OpenAIモック含む）
  - `/api/schedule` - 週間スケジュール生成・管理のテスト
  - `/api/settings` - ユーザー設定管理のテスト

- **サービス層テスト** (76 テスト) - **93.5% カバレッジ達成**
  - **TaskService**: 100% カバレッジ
    - CRUD操作、スケジューリング、AI見積もり統合
    - 時間競合チェック、設定管理、カスタムカテゴリ管理
  - **AIService**: 85.29% カバレッジ
    - OpenAI API統合とフォールバック機能

- **UIコンポーネントテスト** (24 テスト)
  - TaskForm: AI統合フォームの動作テスト
  - React Testing Library による完全なUIテスト

- **ユーティリティテスト** (70 テスト)
  - 日付操作、CSS utilities、型安全性の検証

#### テスト環境の特徴

- **In-memory SQLite**: 高速で独立したデータベーステスト
- **OpenAI APIモック**: 完全なAI機能テスト（APIキー不要）
- **MSW統合**: リアルなAPI request/response テスト
- **カバレッジ追跡**: 継続的な品質管理

### CI/CD パイプライン

GitHub Actions による自動化：

- **継続的インテグレーション**: 184+ テスト、lint、ビルドの自動実行
- **セキュリティスキャン**: npm audit、CodeQL による脆弱性チェック
- **依存関係管理**: Dependabot による自動アップデート
- **コード品質**: ESLint、TypeScript チェック
- **カバレッジ報告**: Codecov による品質追跡

### 開発ワークフロー

1. 機能開発またはバグ修正
2. ローカルテスト実行 (`npm run test:ci`)
3. Pull Request 作成
4. CI パイプライン実行 (184+ テスト、lint、build、security)
5. コードレビュー
6. メインブランチへマージ

#### 品質チェックリスト
- ✅ 全テスト通過 (184+ テスト)
- ✅ Service層カバレッジ 85%+ 維持
- ✅ ESLint/TypeScriptエラー 0件
- ✅ ビルド成功

---

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
