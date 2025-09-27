import React from "react";

interface DashboardStatsProps {
  activeSimulations: number;
  completedSimulations: number;
  totalProfitLoss: number;
  successRate: number;
  averageReturn: number;
}

export function DashboardStats({
  activeSimulations,
  completedSimulations,
  totalProfitLoss,
  successRate,
  averageReturn,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
      {/* アクティブシミュレーション */}
      <div className="bg-white border border-gray-500 p-3">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-blue-400 border border-blue-600 flex items-center justify-center">
              <span className="text-xs font-bold text-black">▶</span>
            </div>
          </div>
          <div className="ml-2 w-0 flex-1">
            <dl>
              <dt className="text-xs font-bold text-black truncate">
                進行中のシミュレーション
              </dt>
              <dd className="text-sm font-bold text-black">
                {activeSimulations}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* 完了シミュレーション */}
      <div className="bg-white border border-gray-500 p-3">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-green-400 border border-green-600 flex items-center justify-center">
              <span className="text-xs font-bold text-black">✓</span>
            </div>
          </div>
          <div className="ml-2 w-0 flex-1">
            <dl>
              <dt className="text-xs font-bold text-black truncate">
                完了したシミュレーション
              </dt>
              <dd className="text-sm font-bold text-black">
                {completedSimulations}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* 総損益 */}
      <div className="bg-white border border-gray-500 p-3">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div
              className={`w-6 h-6 border flex items-center justify-center ${
                totalProfitLoss >= 0 ? "bg-green-400 border-green-600" : "bg-red-400 border-red-600"
              }`}
            >
              <span className="text-xs font-bold text-black">¥</span>
            </div>
          </div>
          <div className="ml-2 w-0 flex-1">
            <dl>
              <dt className="text-xs font-bold text-black truncate">
                総損益
              </dt>
              <dd
                className={`text-sm font-bold ${
                  totalProfitLoss >= 0 ? "text-black" : "text-black"
                }`}
              >
                ¥{totalProfitLoss.toLocaleString()}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* 成功率 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                成功率
              </dt>
              <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {successRate.toFixed(1)}%
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* 平均リターン */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                平均リターン
              </dt>
              <dd
                className={`text-lg font-medium ${
                  averageReturn >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {averageReturn >= 0 ? "+" : ""}
                {averageReturn.toFixed(1)}%
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
