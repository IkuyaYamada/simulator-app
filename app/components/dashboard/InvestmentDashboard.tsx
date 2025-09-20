import React, { useState } from "react";
import { DashboardStats } from "./DashboardStats";
import { NewSimulationButton } from "./NewSimulationButton";
import { ActiveSimulations } from "./ActiveSimulations";
import { CompletedSimulations } from "./CompletedSimulations";
import { LearningInsights } from "./LearningInsights";
import { NewSimulationModal } from "./NewSimulationModal";

// 空のデータ（実際の実装ではAPIから取得）
const emptyDashboardStats = {
  activeSimulations: 0,
  completedSimulations: 0,
  totalProfitLoss: 0,
  successRate: 0,
  averageReturn: 0,
};

const emptyActiveSimulations: any[] = [];
const emptyCompletedSimulations: any[] = [];
const emptyLearningStats = {
  total_reviews: 0,
  correct_hypotheses: 0,
  incorrect_hypotheses: 0,
  success_rate: 0,
  avg_profit_loss: 0,
  profitable_simulations: 0,
  unprofitable_simulations: 0,
};
const emptySuccessPatterns: any[] = [];
const emptyFailurePatterns: any[] = [];

export function InvestmentDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            📈 投資シミュレーション ダッシュボード
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            AIを活用した投資戦略の仮説検証と学習支援システム
          </p>
        </div>

        {/* 統計情報 */}
        <DashboardStats {...emptyDashboardStats} />

        {/* 新しいシミュレーション開始 */}
        <NewSimulationButton
          onStartNewSimulation={() => setIsModalOpen(true)}
        />

        {/* メインコンテンツ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 進行中のシミュレーション */}
          <div>
            <ActiveSimulations simulations={emptyActiveSimulations} />
          </div>

          {/* 完了したシミュレーション */}
          <div>
            <CompletedSimulations simulations={emptyCompletedSimulations} />
          </div>
        </div>

        {/* 学習データベース */}
        <div className="mt-8">
          <LearningInsights
            stats={emptyLearningStats}
            successPatterns={emptySuccessPatterns}
            failurePatterns={emptyFailurePatterns}
          />
        </div>

        {/* 新規シミュレーションモーダル */}
        <NewSimulationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </div>
  );
}
