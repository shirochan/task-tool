import { TaskManager } from "@/components/TaskManager";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          タスク管理ツール
        </h1>
        <p className="text-gray-600">
          AI搭載のタスク管理と週間スケジュール作成
        </p>
      </header>
      
      <TaskManager />
    </div>
  );
}
