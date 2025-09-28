import React, { useState } from "react";
import { Link, useLoaderData, useFetcher } from "react-router";
import { AIScreeningModal } from "./AIScreeningModal";
import { formatToJSTDateOnly, formatCurrency } from "../../utils/date";

export function InvestmentDashboard() {
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const data = useLoaderData() as {
    simulations?: any[];
    error?: string;
  };
  const simulations = data?.simulations || [];
  const error = data?.error;
  const fetcher = useFetcher();

  const handleDelete = (simulationId: string) => {
    if (confirm("このシミュレーションを削除しますか？この操作は取り消せません。")) {
      const formData = new FormData();
      formData.append("simulationId", simulationId);
      fetcher.submit(formData, {
        method: "DELETE",
        action: "/api/simulations"
      });
    }
  };

  // 削除成功時のリロード
  if (fetcher.data?.success) {
    window.location.reload();
  }

  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = formatToJSTDateOnly;

  return (
    <div className="min-h-screen bg-gray-100" style={{fontFamily: 'MS Gothic, monospace'}}>
      <div className="w-full px-4 py-4">
        {/* ヘッダー */}
        <div className="mb-4 bg-gray-300 border-2 border-gray-400 p-3" style={{boxShadow: 'inset 1px 1px 0px #fff, inset -1px -1px 0px #808080'}}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-black">
                シミュレーション一覧
              </h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsAIModalOpen(true)}
                className="bg-blue-400 hover:bg-blue-500 text-black border border-blue-600 px-3 py-1 text-sm font-bold"
              >
                AI銘柄スクリーニング
              </button>
              <Link
                to="/simulations/new"
                className="bg-green-400 hover:bg-green-500 text-black border border-green-600 px-3 py-1 text-sm font-bold inline-block"
              >
                銘柄指定
              </Link>
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 bg-red-100 border border-red-500 p-3">
            <div className="text-sm font-bold text-red-800">
              エラー: {error}
            </div>
          </div>
        )}

        {/* シミュレーション一覧 */}
        {simulations.length === 0 ? (
          <div className="bg-white border border-gray-500 p-4 text-center">
            <div className="text-sm font-bold text-black">
              シミュレーションがありません
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setIsAIModalOpen(true)}
                className="bg-blue-400 hover:bg-blue-500 text-black border border-blue-600 px-3 py-1 text-sm font-bold"
              >
                AI銘柄スクリーニング
              </button>
              <Link
                to="/simulations/new"
                className="bg-green-400 hover:bg-green-500 text-black border border-green-600 px-3 py-1 text-sm font-bold inline-block"
              >
                銘柄指定
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {simulations.map((simulation: any) => {
              const daysRemaining = calculateDaysRemaining(simulation.end_date);
              
              return (
                <div
                  key={simulation.simulation_id}
                  className="bg-white border border-gray-500 p-3"
                >
                  {/* ヘッダー */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-black">
                        {simulation.stock_name}
                      </h3>
                      <p className="text-xs text-black">
                        {simulation.symbol} • {simulation.sector}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-bold border ${
                      simulation.status === 'active' ? 'bg-green-100 border-green-600 text-green-800' :
                      simulation.status === 'completed' ? 'bg-blue-100 border-blue-600 text-blue-800' :
                      'bg-yellow-100 border-yellow-600 text-yellow-800'
                    }`}>
                      {simulation.status === 'active' ? 'アクティブ' :
                       simulation.status === 'completed' ? '完了' : '一時停止'}
                    </span>
                  </div>

                  {/* 基本情報 */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-black font-bold">初期資本:</span>
                      <span className="text-black ml-1">{formatCurrency(simulation.initial_capital)}</span>
                    </div>
                    <div>
                      <span className="text-black font-bold">開始日:</span>
                      <span className="text-black ml-1">{formatDate(simulation.start_date)}</span>
                    </div>
                    <div>
                      <span className="text-black font-bold">終了日:</span>
                      <span className="text-black ml-1">{formatDate(simulation.end_date)}</span>
                    </div>
                    <div>
                      <span className="text-black font-bold">残り日数:</span>
                      <span className={`ml-1 ${
                        daysRemaining > 0 ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {daysRemaining > 0 ? `${daysRemaining}日` : '終了済み'}
                      </span>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex gap-2">
                    <Link
                      to={`/simulations/${simulation.simulation_id}`}
                      className="bg-green-400 hover:bg-green-500 text-black border border-green-600 px-3 py-1 text-xs font-bold"
                    >
                      詳細
                    </Link>
                    <button
                      onClick={() => handleDelete(simulation.simulation_id)}
                      disabled={fetcher.state === "submitting"}
                      className="bg-red-400 hover:bg-red-500 disabled:bg-red-300 text-black border border-red-600 px-3 py-1 text-xs font-bold"
                    >
                      {fetcher.state === "submitting" ? "削除中..." : "削除"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        
        {/* AI銘柄スクリーニングモーダル */}
        <AIScreeningModal
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
        />
      </div>
    </div>
  );
}
