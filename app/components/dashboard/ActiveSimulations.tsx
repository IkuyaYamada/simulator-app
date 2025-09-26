import React from "react";
import { formatToJSTDateOnly } from "../../utils/date";

interface ActiveSimulation {
  simulation_id: string;
  symbol: string; // PRIMARY KEYより直接的な参照
  stock_name: string;
  sector: string;
  initial_capital: number;
  current_portfolio_value: number;
  total_pl: number;
  return_rate: number;
  last_checkpoint_date: string;
  last_checkpoint_type: string;
  last_checkpoint_note: string;
}

interface ActiveSimulationsProps {
  simulations: ActiveSimulation[];
}

export function ActiveSimulations({ simulations }: ActiveSimulationsProps) {
  if (simulations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          📊 進行中のシミュレーション
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            進行中のシミュレーションはありません
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            新しいシミュレーションを開始して投資戦略を検証してみましょう
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        📊 進行中のシミュレーション
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {simulations.map((sim) => (
          <div
            key={sim.simulation_id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  {sim.symbol} - {sim.stock_name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {sim.sector}
                </p>
              </div>
              <div className="text-right">
                <div
                  className={`text-lg font-semibold ${
                    sim.return_rate >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {sim.return_rate >= 0 ? "+" : ""}
                  {sim.return_rate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  ¥{sim.total_pl.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  初期資本:
                </span>
                <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                  ¥{sim.initial_capital.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  現在価値:
                </span>
                <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                  ¥{sim.current_portfolio_value.toLocaleString()}
                </span>
              </div>
            </div>

            {sim.last_checkpoint_date && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between items-center text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      最終チェック:
                    </span>
                    <span className="ml-1 text-gray-900 dark:text-gray-100">
                      {formatToJSTDateOnly(sim.last_checkpoint_date)}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      sim.last_checkpoint_type === "manual"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    }`}
                  >
                    {sim.last_checkpoint_type === "manual" ? "手動" : "自動"}
                  </span>
                </div>
                {sim.last_checkpoint_note && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {sim.last_checkpoint_note}
                  </p>
                )}
              </div>
            )}

            <div className="mt-4">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                詳細を見る
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
