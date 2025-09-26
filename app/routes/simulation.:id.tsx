import { useLoaderData, Link, useFetcher, useParams } from "react-router";
import { useState, useEffect, useMemo } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { formatToJST } from "../utils/date";
import ReactECharts from 'echarts-for-react';

// データ取得API-like functions
async function getSimulation(db: any, id: string) {
  const simulation = await db
    .prepare(`
      SELECT s.*, st.name as stock_name, st.sector, st.industry
      FROM simulations s
      JOIN stocks st ON s.symbol = st.symbol
      WHERE s.simulation_id = ?
    `)
    .bind(id)
    .first();
  return simulation;
}

async function getCheckpoints(db: any, id: string) {
  const checkpoints = await db
    .prepare("SELECT * FROM checkpoints WHERE simulation_id = ? ORDER BY created_at")
    .bind(id)
    .all();
  return checkpoints.results || [];
}

async function getPnLRecords(db: any, id: string) {
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
  return pnlRecords.results || [];
}

async function getConditions(db: any, id: string) {
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
  return conditions.results || [];
}

// 新しい定義: symbolを直接使用してstock情報とstock_pricesを取得
async function getStockData(db: any, symbol: string) {
  const stockData = await db
    .prepare(`
      SELECT symbol, name, sector, industry 
      FROM stocks 
      WHERE symbol = ?
    `)
    .bind(symbol)
    .first();
  
  const stockPrices = await db
    .prepare(`
      SELECT *
      FROM stock_prices 
      WHERE symbol = ? 
      ORDER BY price_date DESC 
      LIMIT 100
    `)
    .bind(symbol)
    .all();
    
  return { stock: stockData, prices: stockPrices.results || [] };
}

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { id } = params;
  
  if (!id) {
    throw new Response("Simulation ID is required", { status: 400 });
  }

  try {
    const db = context.cloudflare.env.simulator_app_db;
    
    // 基本データを取得
    const simulationData = await getSimulation(db, id);

    if (!simulationData) {
      throw new Response("Simulation not found", { status: 404 });
    }

    // symbolベースでstock情報とstock_pricesを取得
    const [checkpointsData, pnlRecordsData, conditionsData, stockData] = await Promise.all([
      getCheckpoints(db, id),
      getPnLRecords(db, id),
      getConditions(db, id),
      // 新しいアプローチ：symbolベースでstockデータを直接取得
      getStockData(db, simulationData.symbol)
    ]);

    return Response.json({
      simulation: simulationData,
      checkpoints: checkpointsData,
      pnlRecords: pnlRecordsData,
      conditions: conditionsData,
      stockData: stockData // 新規追加
    });
  } catch (error) {
    console.error("Error getting simulation:", error);
    throw new Response("Internal Server Error", { status: 500 });
  }
}

export default function SimulationDetail() {
  const data = useLoaderData<typeof loader>() as {
    simulation: any;
    checkpoints: any[];
    pnlRecords: any[];
    conditions: any[];
    stockData: any; // 新規追加
  };

  const { simulation, checkpoints, pnlRecords, conditions, stockData } = data;
  const { id } = useParams();
  const fetcher = useFetcher();
  
  // 基本の株価情報（stabデータベース情報のみ）
  const [stockInfo, setStockInfo] = useState<any>(null);
  
  // チャートデータ用（新しい方法: stockDataと外部APIの組み合わせ）
  const [chartData, setChartData] = useState<any[]>([]);

  // チェックポイントデータを静的に計算（毎回再作成を防ぐ）
  const checkpointDates = useMemo(() => {
    return checkpoints.reduce((acc: Record<string, any>, checkpoint: any) => {
      const date = new Date(checkpoint.created_at || checkpoint.checkpoint_date).toISOString().split('T')[0];
      acc[date] = checkpoint;
      return acc;
    }, {} as Record<string, any>);
  }, [checkpoints]);

  // 株価データHTML取得用のFetcher
  const stockDataFetcher = useFetcher();
  
  // ページロード時に stockData からデータを設定、データがない場合は外部APIから取得
  useEffect(() => {
    if (stockData && stockData.prices && stockData.prices.length > 0) {
      // データベースから取得したstock_pricesデータを使用
      const formattedPrices = stockData.prices.map((price: any) => {
        if (!price || !price.price_date) return null;
        
        const numOpen = Number(price.open_price);
        const numClose = Number(price.close_price);
        const numHigh = Number(price.high_price);
        const numLow = Number(price.low_price);
        const numVolume = Number(price.volume) || 0;
        
        // データの有効性チェック
        const isValid = !isNaN(numOpen) && !isNaN(numClose) && !isNaN(numHigh) && !isNaN(numLow) &&
                       numOpen > 0 && numClose > 0 && numHigh > 0 && numLow > 0;
        
        if (!isValid) return null;
        
        const priceDate = new Date(price.price_date);
        if (isNaN(priceDate.getTime())) return null;
        
        return {
          date: price.price_date,
          fullDate: priceDate.toISOString().split('T')[0],
          high: numHigh,
          low: numLow,
          close: numClose,
          open: numOpen,
          volume: numVolume,
          timestamp: priceDate.getTime() / 1000
        };
      }).filter((item: any) => item !== null); // 無効なデータを除外
      
      setChartData(formattedPrices.reverse()); // 時系列順に並び替え
    } else if (simulation && simulation.symbol && (!stockData || !stockData.prices || stockData.prices.length === 0)) {
      // データベースにデータがない場合、外部APIから取得してデータベースに保存
      console.log('データベースから株価データが見つからないため、外部APIから取得します:', simulation.symbol);
      
      stockDataFetcher.load(`/api/stock-info?symbol=${simulation.symbol}`);
    }
    
    // 基本的な株価情報を設定（データベースから取得された情報）
    if (stockData && stockData.stock) {
      setStockInfo({
        symbol: stockData.stock.symbol,
        name: stockData.stock.name,
        sector: stockData.stock.sector,
        industry: stockData.stock.industry,
        currency: 'JPY' // 日本市場を想定
      });
    }
  }, [stockData, simulation, stockDataFetcher]);
  
  // 外部APIから取得したデータを処理・データベースに保存
  useEffect(() => {
    if (stockDataFetcher.data && !stockDataFetcher.data.error && stockDataFetcher.data.chartData) {
      console.log('外部APIから取得した株価データをデータベースに保存中...', stockDataFetcher.data.chartData.length);
      
      // 外部APIのデータをデータベースに保存する処理
      // この処理をAPIエンドポイントに移行しておく必要がある
      try {
        fetch('/api/stock-prices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: simulation.symbol,
            prices: stockDataFetcher.data.chartData
          })
        }).then(response => {
          if (response.ok) {
            console.log('株価データをデータベースに保存しました');
            // ページを再読み込みしてデータベースから最新データを取得
            window.location.reload();
          } else {
            console.error('株価データの保存に失敗しました');
          }
        });
        
        // 外部APIから取得したデータをチャートに一時的に表示
        const validChartData = stockDataFetcher.data.chartData
          .filter((data: any) => data && typeof data === 'object')
          .map((data: any) => {
            if (!data) return null;
            
            const numOpen = Number(data.open);
            const numClose = Number(data.close);
            const numHigh = Number(data.high);
            const numLow = Number(data.low);
            const numVolume = Number(data.volume) || 0;
            
            const isValid = !isNaN(numOpen) && !isNaN(numClose) && !isNaN(numHigh) && !isNaN(numLow) &&
                           numOpen > 0 && numClose > 0 && numHigh > 0 && numLow > 0;
            
            if (!isValid) return null;
            
            const date = data.date || data.fullDate;
            const priceDate = new Date(date);
            if (isNaN(priceDate.getTime())) return null;
            
            return {
              date: date,
              fullDate: priceDate.toISOString().split('T')[0],
              high: numHigh,
              low: numLow,
              close: numClose,
              open: numOpen,
              volume: numVolume,
              timestamp: priceDate.getTime() / 1000
            };
          }).filter((item: any) => item !== null);
        
        setChartData(validChartData);
        setStockInfo({
          symbol: simulation.symbol,
          name: simulation.stock_name || simulation.symbol,
          currency: 'JPY'
        });
      } catch (error) {
        console.error('株価データの処理に失敗しました:', error);
      }
    }
  }, [stockDataFetcher.data, simulation]);


  // シミュレーション期間に基づくチャートデータフィルタリング（useMemoで最適化）
  const filteredChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    if (!simulation || !simulation.start_date) return chartData; // フォールバック
    
    const simulationStartDate = new Date(simulation.start_date);
    if (isNaN(simulationStartDate.getTime())) return chartData;
    simulationStartDate.setHours(0, 0, 0, 0);
    
    // 開始日の30日前から表示開始
    const startDate = new Date(simulationStartDate);
    startDate.setDate(startDate.getDate() - 30);
    
    // 開始日+3日まで表示
    const endDate = new Date(simulationStartDate);
    endDate.setDate(endDate.getDate() + 3);
    endDate.setHours(23, 59, 59, 999);
    
    const filtered = chartData.filter(data => {
      if (!data) return false;
      
      // timestampフィールドから正確な日付を取得
      if (data.timestamp && !isNaN(data.timestamp)) {
        const dataDate = new Date(data.timestamp * 1000);
        if (isNaN(dataDate.getTime())) return false;
        return dataDate >= startDate && dataDate <= endDate;
      }
      
      // fallback: date文字列からの推測
      if (data.date) {
        const dataDate = new Date(data.date);
        if (isNaN(dataDate.getTime())) return false;
        return dataDate >= startDate && dataDate <= endDate;
      }
      
      // その他のフォールバック
      if (data.fullDate) {
        const dataDate = new Date(data.fullDate);
        if (isNaN(dataDate.getTime())) return false;
        return dataDate >= startDate && dataDate <= endDate;
      }
      
      return false;
    });
    
    return filtered;
  }, [chartData, simulation]);

  // チャートデータとチェックポイントマーカーの統合（useMemoで最適化）
  const chartDataWithMarkers = useMemo(() => {
    if (!filteredChartData || filteredChartData.length === 0) return [];
    
    // 有効なデータを事前にフィルタリング
    const validData = filteredChartData.filter(data => {
      if (!data) return false;
      
      const validHigh = data.high && !isNaN(Number(data.high)) && Number(data.high) > 0;
      const validLow = data.low && !isNaN(Number(data.low)) && Number(data.low) > 0;
      const validClose = data.close && !isNaN(Number(data.close)) && Number(data.close) > 0;
      const validOpen = data.open && !isNaN(Number(data.open)) && Number(data.open) > 0;
      
      return validHigh || validLow || validClose || validOpen;
    });
    
    if (validData.length === 0) return [];
    
    // 時系列でソートしてから処理
    const sortedData = [...validData].sort((a, b) => {
      let dateA: Date, dateB: Date;
      
      // 日付の解析を改善
      if (a.timestamp && !isNaN(a.timestamp)) {
        dateA = new Date(a.timestamp * 1000);
      } else if (a.date) {
        dateA = new Date(a.date);
      } else if (a.fullDate) {
        dateA = new Date(a.fullDate);
      } else {
        dateA = new Date(0); // 最小値
      }
      
      if (b.timestamp && !isNaN(b.timestamp)) {
        dateB = new Date(b.timestamp * 1000);
      } else if (b.date) {
        dateB = new Date(b.date);
      } else if (b.fullDate) {
        dateB = new Date(b.fullDate);
      } else {
        dateB = new Date(0); // 最小値
      }
      
      const diff = dateA.getTime() - dateB.getTime();
      return isNaN(diff) ? 0 : diff;
    });
    
    return sortedData.map((data, index) => {
      let dataDateStr: string;
      
      // timestampがあればそれを使用、なければ日付文字列から推測
      if (data.timestamp && !isNaN(data.timestamp)) {
        dataDateStr = new Date(data.timestamp * 1000).toISOString().split('T')[0];
      } else if (data.date) {
        const dateObj = new Date(data.date);
        if (!isNaN(dateObj.getTime())) {
          dataDateStr = dateObj.toISOString().split('T')[0];
        } else if (data.fullDate) {
          dataDateStr = data.fullDate;
        } else {
          dataDateStr = new Date().toISOString().split('T')[0];
        }
      } else if (data.fullDate) {
        dataDateStr = data.fullDate;
      } else {
        dataDateStr = new Date().toISOString().split('T')[0];
      }
      
      const checkpoint = checkpointDates[dataDateStr] || null;
      
      // 数値データを適切に処理して線の接続を確実にする
      const processedData = {
        ...data,
        high: data.high && !isNaN(Number(data.high)) && Number(data.high) > 0 ? Number(data.high) : null,
        low: data.low && !isNaN(Number(data.low)) && Number(data.low) > 0 ? Number(data.low) : null,
        open: data.open && !isNaN(Number(data.open)) && Number(data.open) > 0 ? Number(data.open) : null,
        close: data.close && !isNaN(Number(data.close)) && Number(data.close) > 0 ? Number(data.close) : null,
        volume: data.volume && !isNaN(Number(data.volume)) ? Number(data.volume) : 0,
        hasCheckpoint: !!checkpoint,
        checkpoint: checkpoint || null,
        date: dataDateStr // 統一された日付文字列
      };
      
      return processedData;
    }).filter(data => {
      // 有効なデータが少なくとも一つ以上あることを確認
      const hasValidData = (data.high !== null && data.high > 0) || 
                          (data.low !== null && data.low > 0) || 
                          (data.close !== null && data.close > 0) || 
                          (data.open !== null && data.open > 0);
      return hasValidData;
    });
  }, [filteredChartData, checkpointDates]);

  // チェックポイント作成モーダルの状態
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [checkpointForm, setCheckpointForm] = useState<{
    type: string;
    date: string;
    note: string;
    hypotheses: string[];
    conditions: Array<{
      type: string;
      metric: string;
      value: string;
    }>;
  }>({
    type: "manual",
    date: new Date().toISOString().split('T')[0],
    note: "",
    hypotheses: [""],
    conditions: []
  });

  // シミュレーション編集モーダルの状態
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<{
    initialCapital: number;
    startDate: string;
    endDate: string;
    status: string;
  }>({
    initialCapital: simulation.initial_capital || 1000000,
    startDate: simulation.start_date || new Date().toISOString().split('T')[0],
    endDate: simulation.end_date || new Date().toISOString().split('T')[0],
    status: simulation.status || 'active'
  });
  
  // 線グラフ切り替え削除、candlestick固定
  const chartType = 'candlestick';

  // チェックポイント日数を計算
  const checkpointCount = useMemo(() => {
    const currentChartData = chartDataWithMarkers.length > 0 ? chartDataWithMarkers : (filteredChartData.length > 0 ? filteredChartData : chartData);
    return currentChartData.filter((data: any) => data.hasCheckpoint).length;
  }, [chartDataWithMarkers, filteredChartData, chartData]);

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

  // シミュレーション編集ハンドラー
  const handleEditSimulation = () => {
    const formData = new FormData();
    formData.append("simulationId", id!);
    formData.append("initialCapital", editForm.initialCapital.toString());
    formData.append("startDate", editForm.startDate);
    formData.append("endDate", editForm.endDate);
    formData.append("status", editForm.status);
    
    fetcher.submit(formData, {
      method: "PUT",
      action: "/api/simulations"
    });
    
    setShowEditModal(false);
  };

  // チェックポイント作成ハンドラー
  const handleCreateCheckpoint = () => {
    const formData = new FormData();
    formData.append("simulationId", id!);
    formData.append("checkpointType", checkpointForm.type);
    formData.append("checkpointDate", checkpointForm.date);
    formData.append("note", checkpointForm.note);
    
    // 投資仮説の追加
    checkpointForm.hypotheses.forEach((hypothesis: string) => {
      if (hypothesis.trim()) {
        formData.append("hypotheses", hypothesis.trim());
      }
    });
    
    // 売買条件の追加
    formData.append("conditions", JSON.stringify(checkpointForm.conditions));
    
    fetcher.submit(formData, {
      method: "POST",
      action: "/api/checkpoints"
    });
    
    setShowCheckpointModal(false);
    setCheckpointForm({
      type: "manual",
      date: new Date().toISOString().split('T')[0],
      note: "",
      hypotheses: [""],
      conditions: []
    });
  };

  // 投資仮説の追加
  const addHypothesis = () => {
    setCheckpointForm((prev: typeof checkpointForm) => ({
      ...prev,
      hypotheses: [...prev.hypotheses, ""]
    }));
  };

  // 投資仮説の削除
  const removeHypothesis = (index: number) => {
    setCheckpointForm((prev: typeof checkpointForm) => ({
      ...prev,
      hypotheses: prev.hypotheses.filter((_, i) => i !== index)
    }));
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
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            基本情報
          </h2>
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              onClick={() => setShowEditModal(true)}
            >
              ✏️ 編集
            </button>
          </div>
          
          {/* 銘柄基本情報の詳細表示（静的データのみ） */}
          {stockInfo && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium text-green-900 dark:text-green-100 text-lg">
                  📊 銘柄情報
                </h3>
                <div className="text-xs text-green-600 dark:text-green-400">
                  <p>銘柄コード: {simulation.symbol}</p>
                  <p>データベース取得</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                {/* 基本情報 */}
                <div className="space-y-3">
                  <div>
                    <p className="text-green-700 dark:text-green-300 font-medium text-sm">ティッカーシンボル</p>
                    <p className="text-green-900 dark:text-green-100 font-bold text-lg">
                      {stockInfo.symbol || simulation.symbol}
                    </p>
                  </div>
                  <div>
                    <p className="text-green-700 dark:text-green-300 font-medium text-sm">会社名</p>
                    <p className="text-green-900 dark:text-green-100 font-bold">
                      {stockInfo.name || simulation.stock_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-green-700 dark:text-green-300 font-medium text-sm">業界</p>
                    <p className="text-green-900 dark:text-green-100">
                      {stockInfo.industry || stockInfo.sector || simulation.industry || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* 価格情報（静的データベース情報のみ） */}
                <div className="space-y-3">
                  <div>
                    <p className="text-green-700 dark:text-green-300 font-medium text-sm">データベース取得済みデータ</p>
                    <p className="text-green-900 dark:text-green-100 font-bold">
                      株価チャートデータが表示されています
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {stockData && stockData.prices ? `${stockData.prices.length}件のデータ` : 'データなし'}
                    </p>
                  </div>
                </div>

                {/* 基本的な情報 */}
                <div className="space-y-3">
                  <div>
                    <p className="text-green-700 dark:text-green-300 font-medium text-sm">データ取得方法</p>
                    <p className="text-green-900 dark:text-green-100">
                      データベース（{stockInfo.currency}）
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                {formatToJST(simulation.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* 株価チャート（静的データベース情報のみ） */}
        {chartData && chartData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                📈 株価チャート {simulation?.start_date && filteredChartData.length > 0 ? `(-30日〜${simulation.start_date} +3日間)` : ''}
              </h2>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3 text-sm">
                📊 データベース情報
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-blue-700 dark:text-blue-300 font-medium">データ件数</p>
                  <p className="text-blue-900 dark:text-blue-100 font-bold text-lg">
                    {chartData.length}件
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    データベースから取得
                  </p>
                </div>
                <div>
                  <p className="text-blue-700 dark:text-blue-300 font-medium">銘柄コード</p>
                  <p className="text-blue-900 dark:text-blue-100 font-bold text-lg">
                    {simulation.symbol}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    シミュレーション対象
                  </p>
                </div>
                <div>
                  <p className="text-blue-700 dark:text-blue-300 font-medium">期間</p>
                  <p className="text-blue-900 dark:text-blue-100">
                    {simulation.start_date} から分析可能
                  </p>
                </div>
              </div>
            </div>

            {/* チャート表示切替ボタン削除 - ローソク足固定 */}

            <div style={{ width: '100%', height: '400px' }}>
              <ReactECharts 
                key={`candlestick-${id}`}
                notMerge={true}
                lazyUpdate={false}
                option={(() => {
                  const currentChartData = chartDataWithMarkers.length > 0 ? chartDataWithMarkers : (filteredChartData.length > 0 ? filteredChartData : chartData);
                  
                  if (!currentChartData || currentChartData.length === 0) {
                    return {
                      title: {
                        text: 'データなし',
                        left: 'center',
                        top: 'middle'
                      }
                    };
                  }
                  
                  const currency = stockInfo?.currency || 'USD';
                  const symbol = currency === 'JPY' ? '¥' : '$';
                  
                  // ECharts公式例に従ったデータ分割処理
                  function splitData(rawData: any[]) {
                    const categoryData: string[] = [];
                    const values: any[][] = [];
                    const volumns: number[] = [];
                    
                    for (let i = 0; i < rawData.length; i++) {
                      const data = rawData[i];
                      if (data && typeof data === 'object') {
                        const date = data.date || data.fullDate || (data.timestamp ? new Date(data.timestamp * 1000).toISOString().split('T')[0] : '');
                        if (date) {
                          categoryData.push(date);
                          
                          const open = Number(data.open) || 0;
                          const close = Number(data.close) || 0;
                          const low = Number(data.low) || 0;
                          const high = Number(data.high) || 0;
                          const volume = Number(data.volume) || 0;
                          
                          values.push([open, close, low, high]);
                          volumns.push(volume);
                        }
                      }
                    }
                    
                    return {
                      categoryData,
                      values,
                      volumns
                    };
                  }

                  // splitData関数を使用してデータを処理
                  const data = splitData(currentChartData);
                  
                  if (!data.categoryData.length || !data.values.length) {
                    return {
                      title: {
                        text: '有効なデータなし',
                        left: 'center',
                        top: 'middle'
                      }
                    };
                  }
                  
                  // 価格範囲の計算
                  const validPrices: number[] = [];
                  for (const vals of data.values) {
                    if (Array.isArray(vals) && vals.length >= 4) {
                      const [open, close, low, high] = vals;
                      if (open && !isNaN(open) && open > 0) validPrices.push(open);
                      if (close && !isNaN(close) && close > 0) validPrices.push(close);
                      if (low && !isNaN(low) && low > 0) validPrices.push(low);
                      if (high && !isNaN(high) && high > 0) validPrices.push(high);
                    }
                  }
                  
                  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
                  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 100;
                  const margin = Math.max((maxPrice - minPrice) * 0.05, 0.1);
                  
                  // チェックポイントラインのデータを準備
                  const checkpointLinesData = currentChartData
                    .filter((data: any) => data && data.hasCheckpoint)
                    .map((data: any) => {
                      const dataDate = data.date || data.fullDate || new Date(data.timestamp * 1000).toISOString().split('T')[0];
                      const date = new Date(dataDate);
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const formattedDate = `${year}/${month}/${day}`;

                      return {
                        xAxis: dataDate,
                        lineStyle: {
                          width: 2,
                          type: 'dashed',
                          color: '#f59e0b'
                        },
                        label: {
                          show: true,
                          position: 'end',
                          formatter: '📌',
                          fontSize: 12,
                          color: '#f59e0b',
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          borderColor: '#f59e0b',
                          borderWidth: 1,
                          borderRadius: 3,
                          padding: [2, 4]
                        }
                      };
                    });
                  
                  // 移動平均線計算関数（ECharts公式例と同じ形式）
                  function calculateMA(dayCount: number, data: any) {
                    const result: any[] = [];
                    for (let i = 0; i < data.values.length; i++) {
                      if (i < dayCount - 1) {
                        result.push('-');
                        continue;
                      }
                      let sum = 0;
                      for (let j = 0; j < dayCount; j++) {
                        if (data.values[i - j] && data.values[i - j][1] && !isNaN(data.values[i - j][1])) {
                          sum += data.values[i - j][1]; // close price
                        }
                      }
                      result.push(+(sum / dayCount).toFixed(3));
                    }
                    return result;
                  }

                  // 移動平均の計算（新しいデータ構造に対応）
                  const ma5 = calculateMA(5, data);
                  const ma10 = calculateMA(10, data);
                  const ma20 = calculateMA(20, data);
                  const ma30 = calculateMA(30, data);

                  return {
                    grid: [
                      {
                        left: '10%',
                        right: '8%',
                        height: '50%'
                      },
                      {
                        left: '10%',
                        right: '8%',
                        bottom: '20%',
                        height: '15%'
                      }
                    ],
                    xAxis: [
                      {
                        type: 'category',
                        data: data.categoryData,
                        scale: true,
                        boundaryGap: false,
                        axisLine: { onZero: false },
                        splitLine: { show: false },
                        splitNumber: 20,
                        min: 'dataMin',
                        max: 'dataMax',
                        axisPointer: {
                          z: 100
                        }
                      },
                      {
                        type: 'category',
                        gridIndex: 1,
                        data: data.categoryData,
                        scale: true,
                        boundaryGap: false,
                        axisLine: { onZero: false },
                        axisTick: { show: false },
                        splitLine: { show: false },
                        axisLabel: { show: false },
                        splitNumber: 20,
                        min: 'dataMin',
                        max: 'dataMax',
                        axisPointer: {
                          label: {
                            formatter: function (params: any) {
                              const seriesValue = (params.seriesData && params.seriesData[0] || {}).value;
                              return (
                                params.value +
                                (seriesValue != null
                                  ? '\n' + seriesValue
                                  : '')
                              );
                            }
                          }
                        }
                      }
                    ],
                    yAxis: [
                      {
                        scale: true,
                        splitArea: {
                          show: true
                        }
                      },
                      {
                        scale: true,
                        gridIndex: 1,
                        splitNumber: 2,
                        axisLabel: { show: false },
                        axisLine: { show: false },
                        axisTick: { show: false },
                        splitLine: { show: false }
                      }
                    ],
                    dataZoom: [
                      {
                        type: 'inside',
                        xAxisIndex: [0, 1],
                        start: 98,
                        end: 100,
                        zoomOnMouseWheel: false,
                        moveOnMouseMove: true,
                        moveOnMouseWheel: false
                      },
                      {
                        show: true,
                        xAxisIndex: [0, 1],
                        type: 'slider',
                        top: '85%',
                        start: 98,
                        end: 100,
                        zoomOnMouseWheel: false,
                        moveOnMouseWheel: false
                      }
                    ],
                    tooltip: {
                      trigger: 'axis',
                      axisPointer: {
                        type: 'cross'
                      },
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      position: function (pos: [number, number], params: any, el: HTMLElement, elRect: any, size: any) {
                        const obj: any = { top: 10 };
                        obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
                        return obj;
                      } as any,
                      extraCssText: 'width: 170px'
                    },
                    legend: {
                      bottom: 10,
                      left: 'center',
                      data: ['ローソク足', 'MA5', 'MA10', 'MA20', 'MA30', '取引高']
                    },
                    series: [
                      {
                        name: 'ローソク足',
                        type: 'candlestick',
                        data: data.values,
                        itemStyle: {
                          color: '#10b981',  // 緑（上昇）
                          color0: '#ef4444', // 赤（下落）
                          borderColor: null,
                          borderColor0: null
                        },
                        tooltip: {
                          formatter: function (param: any) {
                            const datum = param[0];
                            return [
                              '日付: ' + datum.name + '<hr size=1 style="margin: 3px 0">',
                              '始値: ' + datum.data[0] + '<br/>',
                              '終値: ' + datum.data[1] + '<br/>',
                              '安値: ' + datum.data[2] + '<br/>',
                              '高値: ' + datum.data[3] + '<br/>'
                            ].join('');
                          }
                        }
                      },
                      {
                        name: 'MA5',
                        type: 'line',
                        data: ma5,
                        smooth: true,
                        lineStyle: {
                          opacity: 0.5,
                          width: 1,
                          color: '#fbbf24'
                        },
                        itemStyle: {
                          color: '#fbbf24'
                        },
                        showSymbol: false
                      },
                      {
                        name: 'MA10',
                        type: 'line',
                        data: ma10,
                        smooth: true,
                        lineStyle: {
                          opacity: 0.5,
                          width: 1,
                          color: '#f59e0b'
                        },
                        itemStyle: {
                          color: '#f59e0b'
                        },
                        showSymbol: false
                      },
                      {
                        name: 'MA20',
                        type: 'line',
                        data: ma20,
                        smooth: true,
                        lineStyle: {
                          opacity: 0.5,
                          width: 1,
                          color: '#8b5cf6'
                        },
                        itemStyle: {
                          color: '#8b5cf6'
                        },
                        showSymbol: false
                      },
                      {
                        name: 'MA30',
                        type: 'line',
                        data: ma30,
                        smooth: true,
                        lineStyle: {
                          opacity: 0.5,
                          width: 1,
                          color: '#6b7280'
                        },
                        itemStyle: {
                          color: '#6b7280'
                        },
                        showSymbol: false
                      },
                      {
                        name: '取引高',
                        type: 'bar',
                        xAxisIndex: 1,
                        yAxisIndex: 1,
                        data: data.volumns
                      }
                    ],
                    markLine: checkpointLinesData.length > 0 ? { data: checkpointLinesData } : undefined
                  };
                })()}
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            {/* 凡例とチャート詳細情報 */}
            <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-400 mr-1"></div>
                  <span>ローソク足 (上昇緑・下落赤)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-0.5 h-4 border-l-2 border-orange-500"
                    style={{
                      borderStyle: 'dashed'
                    }}
                  ></div>
                  <span>📌 チェックポイント ({checkpointCount}日)</span>
                </div>
              </div>
              <span>※ 過去100日間の日足データ | クリックして詳細を表示</span>
            </div>
            
          </div>
        )}

        {/* チェックポイント一覧 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              チェックポイント ({checkpoints.length})
            </h2>
            <button
              onClick={() => setShowCheckpointModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              チェックポイントを作成
            </button>
          </div>
          {checkpoints.length > 0 ? (
            <div className="space-y-4">
              {checkpoints.map((checkpoint: any) => (
                <div 
                  key={checkpoint.checkpoint_id}
                  id={`checkpoint-${checkpoint.checkpoint_id}`}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {checkpoint.checkpoint_type === 'manual' ? '手動チェックポイント' : 
                         checkpoint.checkpoint_type === 'initial' ? '初期チェックポイント（チェックポイントゼロ）' :
                         checkpoint.checkpoint_type === 'auto_buy' ? '自動買いチェックポイント' :
                         checkpoint.checkpoint_type === 'auto_sell' ? '自動売りチェックポイント' : 
                         'チェックポイント'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatToJST(checkpoint.created_at || checkpoint.checkpoint_date + 'T00:00:00')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      checkpoint.checkpoint_type === 'manual' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : checkpoint.checkpoint_type === 'initial' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : checkpoint.checkpoint_type === 'auto_buy'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : checkpoint.checkpoint_type === 'auto_sell'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {checkpoint.checkpoint_type}
                    </span>
                  </div>
                  {checkpoint.note && (
                    <p className="mt-2 text-gray-700 dark:text-gray-300">
                      {checkpoint.note}
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
              {conditions.map((condition: any) => (
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
                      {formatToJST(condition.updated_at)}
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
                  {pnlRecords.map((record: any) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatToJST(record.recorded_at)}
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
      
      {/* シミュレーション編集モーダル */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                シミュレーション編集
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleEditSimulation(); }}>
              {/* 基本設定 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    初期資本
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={editForm.initialCapital}
                      onChange={(e) => setEditForm((prev: typeof editForm) => ({ ...prev, initialCapital: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      min="1000"
                      step="1000"
                    />
                    <span className="absolute right-3 top-2 text-gray-600 dark:text-gray-400 text-sm">
                      円
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ステータス
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev: typeof editForm) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="active">アクティブ</option>
                    <option value="completed">完了</option>
                    <option value="paused">一時停止</option>
                    <option value="cancelled">キャンセル</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    開始日
                  </label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm((prev: typeof editForm) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    終了日
                  </label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm((prev: typeof editForm) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* ボタン */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={fetcher.state === "submitting"}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
                >
                  {fetcher.state === "submitting" ? "更新中..." : "変更を保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* チェックポイント作成モーダル */}
      {showCheckpointModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                チェックポイント作成
              </h3>
              <button
                onClick={() => setShowCheckpointModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateCheckpoint(); }}>
              {/* 基本情報 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    チェックポイントタイプ
                  </label>
                  <select
                    value={checkpointForm.type}
                    onChange={(e) => setCheckpointForm((prev: typeof checkpointForm) => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="manual">手動チェックポイント</option>
                    <option value="initial">初期チェックポイント</option>
                    <option value="auto_buy">自動買いチェックポイント</option>
                    <option value="auto_sell">自動売りチェックポイント</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    日付
                  </label>
                  <input
                    type="date"
                    value={checkpointForm.date}
                    onChange={(e) => setCheckpointForm((prev: typeof checkpointForm) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* メモ */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  メモ
                </label>
                <textarea
                  value={checkpointForm.note}
                  onChange={(e) => setCheckpointForm((prev: typeof checkpointForm) => ({ ...prev, note: e.target.value }))}
                  placeholder="チェックポイントに関するメモを入力してください..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* 投資仮説 */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    投資仮説
                  </label>
                  <button
                    type="button"
                    onClick={addHypothesis}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
                  >
                    仮説を追加
                  </button>
                </div>

                {checkpointForm.hypotheses.map((hypothesis, index) => (
                  <div key={index} className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={hypothesis}
                      onChange={(e) => {
                        const newHypotheses = [...checkpointForm.hypotheses];
                        newHypotheses[index] = e.target.value;
                        setCheckpointForm((prev: typeof checkpointForm) => ({ ...prev, hypotheses: newHypotheses }));
                      }}
                      placeholder={`投資仮説 ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {checkpointForm.hypotheses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeHypothesis(index)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md"
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* ボタン */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowCheckpointModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={fetcher.state === "submitting"}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
                >
                  {fetcher.state === "submitting" ? "作成中..." : "チェックポイントを作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
