import { useLoaderData, Link, useFetcher } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ context }: LoaderFunctionArgs) {
  try {
    const db = context.cloudflare.env.simulator_app_db;

    const simulations = await db.prepare(`
      SELECT 
        s.simulation_id,
        s.initial_capital,
        s.start_date,
        s.end_date,
        s.status,
        s.created_at,
        st.symbol,
        st.name as stock_name,
        st.sector,
        st.industry
      FROM simulations s
      JOIN stocks st ON s.stock_id = st.stock_id
      ORDER BY s.created_at DESC
    `).all();

    return Response.json({ simulations: simulations.results });

  } catch (error) {
    console.error("Simulation list error:", error);
    return Response.json({ 
      error: "Internal server error",
      simulations: []
    });
  }
}

export default function SimulationsPage() {
  const data = useLoaderData<typeof loader>() as {
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400", text: "アクティブ" },
      completed: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400", text: "完了" },
      paused: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400", text: "一時停止" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="mb-4">
            <Link 
              to="/" 
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← ホームに戻る
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                📊 シミュレーション一覧
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                作成済みの投資シミュレーションを管理・確認できます
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ➕ 新しいシミュレーション
            </Link>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  エラーが発生しました
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* シミュレーション一覧 */}
        {simulations.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              シミュレーションがありません
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              新しいシミュレーションを作成して始めましょう
            </p>
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ➕ 新しいシミュレーション
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {simulations.map((simulation: any) => {
              const daysRemaining = calculateDaysRemaining(simulation.end_date);
              
              return (
                <div
                  key={simulation.simulation_id}
                  className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
                >
                  {/* ヘッダー */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {simulation.stock_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {simulation.symbol} • {simulation.sector}
                      </p>
                    </div>
                    {getStatusBadge(simulation.status)}
                  </div>

                  {/* 基本情報 */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">初期資本</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(simulation.initial_capital)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">開始日</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(simulation.start_date)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">終了日</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(simulation.end_date)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">残り日数</span>
                      <span className={`text-sm font-medium ${
                        daysRemaining > 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {daysRemaining > 0 ? `${daysRemaining}日` : '終了済み'}
                      </span>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex gap-2">
                    <Link
                      to={`/simulations/${simulation.simulation_id}`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md text-center transition-colors duration-200"
                    >
                      詳細を見る
                    </Link>
                    <button
                      onClick={() => handleDelete(simulation.simulation_id)}
                      disabled={fetcher.state === "submitting"}
                      className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-md transition-colors duration-200"
                    >
                      🗑️
                    </button>
                    <button
                      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors duration-200"
                    >
                      ⚙️
                    </button>
                  </div>

                  {/* 作成日時 */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      作成: {new Date(simulation.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
