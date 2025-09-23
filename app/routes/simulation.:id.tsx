import { useLoaderData, Link, useFetcher, useParams } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { id } = params;
  
  if (!id) {
    throw new Response("Simulation ID is required", { status: 400 });
  }

  try {
    const db = context.cloudflare.env.simulator_app_db;
    
    // シミュレーション情報を取得
    const simulation = await db
      .prepare("SELECT * FROM simulations WHERE simulation_id = ?")
      .bind(id)
      .first();

    if (!simulation) {
      throw new Response("Simulation not found", { status: 404 });
    }

    // チェックポイント情報を取得
    const checkpoints = await db
      .prepare("SELECT * FROM checkpoints WHERE simulation_id = ? ORDER BY created_at")
      .bind(id)
      .all();

    // PnL記録を取得（checkpoint_idを通じて）
    const pnlRecords = await db
      .prepare(`
        SELECT pr.*, sp.price_date, sp.close_price as price
        FROM pnl_records pr
        JOIN checkpoints c ON pr.checkpoint_id = c.checkpoint_id
        JOIN stock_prices sp ON pr.stock_price_id = sp.stock_price_id
        WHERE c.simulation_id = ?
        ORDER BY pr.recorded_at
      `)
      .bind(id)
      .all();

    // 売買条件を取得（最新のチェックポイントから）
    const conditions = await db
      .prepare(`
        SELECT c.*, cp.checkpoint_date
        FROM conditions c
        JOIN checkpoints cp ON c.checkpoint_id = cp.checkpoint_id
        WHERE cp.simulation_id = ? AND c.is_active = 1
        ORDER BY cp.checkpoint_date DESC, c.updated_at DESC
      `)
      .bind(id)
      .all();

    return Response.json({
      simulation,
      checkpoints: checkpoints.results || [],
      pnlRecords: pnlRecords.results || [],
      conditions: conditions.results || [],
    });
  } catch (error) {
    console.error("Error loading simulation:", error);
    return Response.json(
      { error: "Failed to load simulation" },
      { status: 500 }
    );
  }
}

export default function SimulationDetail() {
  const data = useLoaderData<typeof loader>() as {
    simulation: any;
    checkpoints: any[];
    pnlRecords: any[];
    conditions: any[];
  };

  const { simulation, checkpoints, pnlRecords, conditions } = data;
  const { id } = useParams();
  const fetcher = useFetcher();

  const handleDelete = () => {
    if (confirm("このシミュレーションを削除しますか？この操作は取り消せません。")) {
      const formData = new FormData();
      formData.append("simulationId", id!);
      fetcher.submit(formData, {
        method: "DELETE",
        action: "/api/simulations"
      });
    }
  };

  // 削除成功時のリダイレクト
  if (fetcher.data?.success) {
    window.location.href = "/simulations";
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                ← ホームに戻る
              </Link>
              <Link 
                to="/simulations" 
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                ← シミュレーション一覧に戻る
              </Link>
            </div>
            <button
              onClick={handleDelete}
              disabled={fetcher.state === "submitting"}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              {fetcher.state === "submitting" ? "削除中..." : "シミュレーションを削除"}
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            シミュレーション詳細
          </h1>
        </div>

        {/* シミュレーション基本情報 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            基本情報
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                銘柄コード
              </label>
              <p className="text-lg text-gray-900 dark:text-white">
                {simulation.symbol}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                初期資本
              </label>
              <p className="text-lg text-gray-900 dark:text-white">
                ¥{simulation.initial_capital?.toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                開始日
              </label>
              <p className="text-lg text-gray-900 dark:text-white">
                {simulation.start_date}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                終了日
              </label>
              <p className="text-lg text-gray-900 dark:text-white">
                {simulation.end_date}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                ステータス
              </label>
              <p className="text-lg text-gray-900 dark:text-white">
                {simulation.status}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                作成日時
              </label>
              <p className="text-lg text-gray-900 dark:text-white">
                {new Date(simulation.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </p>
            </div>
          </div>
        </div>

        {/* チェックポイント一覧 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            チェックポイント ({checkpoints.length})
          </h2>
          {checkpoints.length > 0 ? (
            <div className="space-y-4">
              {checkpoints.map((checkpoint) => (
                <div 
                  key={checkpoint.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {checkpoint.type === 'manual' ? '手動チェックポイント' : '自動チェックポイント'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(checkpoint.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      checkpoint.type === 'manual' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {checkpoint.type}
                    </span>
                  </div>
                  {checkpoint.notes && (
                    <p className="mt-2 text-gray-700 dark:text-gray-300">
                      {checkpoint.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              チェックポイントがありません
            </p>
          )}
        </div>

        {/* 売買条件一覧 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            現在の売買条件 ({conditions.length})
          </h2>
          {conditions.length > 0 ? (
            <div className="space-y-4">
              {conditions.map((condition) => (
                <div 
                  key={condition.condition_id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {condition.type === 'buy' ? '買い条件' : 
                         condition.type === 'sell' ? '売り条件' :
                         condition.type === 'profit_take' ? '利確条件' :
                         condition.type === 'stop_loss' ? '損切り条件' : condition.type}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        チェックポイント: {condition.checkpoint_date}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      condition.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {condition.is_active ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        指標
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {condition.metric}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        条件値
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {condition.value}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      更新日時
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {new Date(condition.updated_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              売買条件が設定されていません
            </p>
          )}
        </div>

        {/* PnL記録一覧 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            PnL記録 ({pnlRecords.length})
          </h2>
          {pnlRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      株価
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      ポジションサイズ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      実現損益
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      未実現損益
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {pnlRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(record.recorded_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ¥{record.price?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record.position_size}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        record.realized_pl >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {record.realized_pl >= 0 ? '+' : ''}¥{record.realized_pl?.toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        record.unrealized_pl >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {record.unrealized_pl >= 0 ? '+' : ''}¥{record.unrealized_pl?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              PnL記録がありません
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
