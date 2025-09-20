import React from "react";

interface LearningStats {
  total_reviews: number;
  correct_hypotheses: number;
  incorrect_hypotheses: number;
  success_rate: number;
  avg_profit_loss: number;
  profitable_simulations: number;
  unprofitable_simulations: number;
}

interface SuccessPattern {
  simulation_id: string;
  symbol: string;
  stock_name: string;
  sector: string;
  final_profit_loss: number;
  outcome_memo: string;
  learning: string;
}

interface FailurePattern {
  simulation_id: string;
  symbol: string;
  stock_name: string;
  sector: string;
  final_profit_loss: number;
  outcome_memo: string;
  learning: string;
}

interface LearningInsightsProps {
  stats: LearningStats;
  successPatterns: SuccessPattern[];
  failurePatterns: FailurePattern[];
}

export function LearningInsights({
  stats,
  successPatterns,
  failurePatterns,
}: LearningInsightsProps) {
  if (stats.total_reviews === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          📚 学習データベース
        </h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            学習データがありません
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            シミュレーションを完了すると、ここに学習データが蓄積されます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
        📚 学習データベース
      </h3>

      {/* 学習統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.success_rate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">成功率</div>
        </div>
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.profitable_simulations}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            利益シミュレーション
          </div>
        </div>
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.total_reviews}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            総レビュー数
          </div>
        </div>
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div
            className={`text-2xl font-bold ${
              stats.avg_profit_loss >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {stats.avg_profit_loss >= 0 ? "+" : ""}¥
            {stats.avg_profit_loss.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            平均損益
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 成功パターン */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            成功パターン
          </h4>
          {successPatterns.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              成功パターンはまだありません
            </p>
          ) : (
            <div className="space-y-3">
              {successPatterns.slice(0, 3).map((pattern) => (
                <div
                  key={pattern.simulation_id}
                  className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50 dark:bg-green-900/20"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100">
                      {pattern.symbol} - {pattern.stock_name}
                    </h5>
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      +¥{pattern.final_profit_loss.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {pattern.learning}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 失敗パターン */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            失敗パターン
          </h4>
          {failurePatterns.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              失敗パターンはまだありません
            </p>
          ) : (
            <div className="space-y-3">
              {failurePatterns.slice(0, 3).map((pattern) => (
                <div
                  key={pattern.simulation_id}
                  className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-900/20"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100">
                      {pattern.symbol} - {pattern.stock_name}
                    </h5>
                    <span className="text-red-600 dark:text-red-400 font-semibold">
                      ¥{pattern.final_profit_loss.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {pattern.learning}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(successPatterns.length > 0 || failurePatterns.length > 0) && (
        <div className="mt-6 text-center">
          <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
            学習データベースを詳しく見る
          </button>
        </div>
      )}
    </div>
  );
}
