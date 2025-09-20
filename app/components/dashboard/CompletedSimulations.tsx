import React from "react";

interface CompletedSimulation {
  simulation_id: string;
  symbol: string;
  stock_name: string;
  sector: string;
  start_date: string;
  end_date: string;
  final_profit_loss: number;
  final_return_rate: number;
  is_hypothesis_correct: boolean;
  outcome_memo: string;
  learning: string;
  reviewed_at: string;
}

interface CompletedSimulationsProps {
  simulations: CompletedSimulation[];
}

export function CompletedSimulations({
  simulations,
}: CompletedSimulationsProps) {
  if (simulations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          ✅ 完了したシミュレーション
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            完了したシミュレーションはありません
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            シミュレーションを完了すると、ここに結果が表示されます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        ✅ 完了したシミュレーション
      </h3>

      <div className="space-y-4">
        {simulations.map((sim) => (
          <div
            key={sim.simulation_id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    {sim.symbol} - {sim.stock_name}
                  </h4>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      sim.is_hypothesis_correct
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {sim.is_hypothesis_correct ? "仮説正解" : "仮説外れ"}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {sim.sector} •{" "}
                  {new Date(sim.start_date).toLocaleDateString("ja-JP")} -{" "}
                  {new Date(sim.end_date).toLocaleDateString("ja-JP")}
                </p>
              </div>
              <div className="text-right ml-4">
                <div
                  className={`text-xl font-bold ${
                    sim.final_return_rate >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {sim.final_return_rate >= 0 ? "+" : ""}
                  {sim.final_return_rate.toFixed(1)}%
                </div>
                <div
                  className={`text-sm ${
                    sim.final_profit_loss >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {sim.final_profit_loss >= 0 ? "+" : ""}¥
                  {sim.final_profit_loss.toLocaleString()}
                </div>
              </div>
            </div>

            {sim.outcome_memo && (
              <div className="mb-3">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  結果メモ
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {sim.outcome_memo}
                </p>
              </div>
            )}

            {sim.learning && (
              <div className="mb-3">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  学習内容
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {sim.learning}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                レビュー日:{" "}
                {new Date(sim.reviewed_at).toLocaleDateString("ja-JP")}
              </span>
              <div className="flex gap-2">
                <button className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-1 px-3 rounded text-xs transition-colors">
                  レビューを見る
                </button>
                <button className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-xs transition-colors">
                  新しいシミュレーション
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
