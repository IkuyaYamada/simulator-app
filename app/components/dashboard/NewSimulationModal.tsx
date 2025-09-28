import React, { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { StockChart } from "../common/StockChart";

interface NewSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewSimulationModal({
  isOpen,
  onClose,
}: NewSimulationModalProps) {
  // 銘柄情報入力用の状態
  const [tickerSymbol, setTickerSymbol] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  
  // 株価情報取得用
  const stockInfoFetcher = useFetcher();
  
  // シミュレーション作成用
  const simulationFetcher = useFetcher();
  
  // シミュレーション設定用の状態
  const [initialCapital, setInitialCapital] = useState(1000000); // デフォルト100万円
  const [simulationPeriod, setSimulationPeriod] = useState(3); // デフォルト3ヶ月
  
  // 売買条件の状態
  const [tradingConditions, setTradingConditions] = useState<Array<{
    type: 'buy' | 'sell';
    metric: 'price';
    value: string;
    description?: string;
  }>>([
      {
        type: 'buy',
        metric: 'price',
        value: '',
        description: '最新の終値での購入'
      },
      {
        type: 'sell',
        metric: 'price',
        value: '',
        description: '20%上昇時の利確'
      },
      {
        type: 'sell',
        metric: 'price',
        value: '',
        description: '10%下落時の損切り'
      }
  ]);


  // 株価情報取得結果の処理
  useEffect(() => {
    if (stockInfoFetcher.data && !stockInfoFetcher.data.error) {
      const stockData = stockInfoFetcher.data;
      setCompanyName(stockData.longName || stockData.shortName || "");
      setIndustry(stockData.industry || stockData.sector || "");
      
      // 売買条件の初期値を設定（最新の終値があれば購入条件に設定）
      const currentPrice = stockData.regularMarketPrice || stockData.previousClose;
      
      if (currentPrice) {
        setTradingConditions(prev => 
          prev.map((condition, index) => {
            if (index === 0 && condition.type === 'buy' && condition.metric === 'price') {
              return {
                ...condition,
                value: currentPrice.toFixed(2),
                description: '最新の終値での購入'
              };
            } else if (index === 1 && condition.type === 'sell' && condition.metric === 'price') {
              // 売却条件1: 20%上昇時
              const sellPrice1 = (currentPrice * 1.2).toFixed(2);
              return {
                ...condition,
                value: sellPrice1,
                description: '20%上昇時の利確'
              };
            } else if (index === 2 && condition.type === 'sell' && condition.metric === 'price') {
              // 売却条件2: 10%下落時
              const sellPrice2 = (currentPrice * 0.9).toFixed(2);
              return {
                ...condition,
                value: sellPrice2,
                description: '10%下落時の損切り'
              };
            }
            return condition;
          })
        );
      }
    }
  }, [stockInfoFetcher.data]);

  // シミュレーション作成結果の処理
  useEffect(() => {
    if (simulationFetcher.data && !simulationFetcher.data.error) {
      alert(`シミュレーションが作成されました！\nシミュレーションID: ${simulationFetcher.data.simulationId}`);
      handleClose();
    } else if (simulationFetcher.data && simulationFetcher.data.error) {
      alert(`エラー: ${simulationFetcher.data.error}`);
    }
  }, [simulationFetcher.data]);

  if (!isOpen) return null;

  const handleClose = () => {
    setTickerSymbol("");
    setCompanyName("");
    setIndustry("");
    setInitialCapital(1000000);
    setSimulationPeriod(3);
    // 売買条件をデフォルト値にリセット
    setTradingConditions([
      {
        type: 'buy',
        metric: 'price',
        value: '',
        description: '最新の終値での購入'
      },
      {
        type: 'sell',
        metric: 'price',
        value: '',
        description: '20%上昇時の利確'
      },
      {
        type: 'sell',
        metric: 'price',
        value: '',
        description: '10%下落時の損切り'
      }
    ]);
    onClose();
  };

  // シミュレーション開始前のバリデーション
  const validateSimulationData = () => {
    const errors = [];

    // 銘柄情報のチェック
    if (!tickerSymbol || !stockInfoFetcher.data) {
      errors.push("銘柄情報が取得できていません");
    }

    // 売買条件のチェック
    const validConditions = tradingConditions.filter(condition => 
      condition.type && condition.metric && condition.value && condition.value.trim() !== ''
    );
    
    if (validConditions.length === 0) {
      errors.push("少なくとも1つの売買条件を設定してください");
    }

    // 銘柄情報のチェック
    if (!tickerSymbol.trim() || !companyName.trim()) {
      errors.push("銘柄情報を正しく入力してください");
    }

    return errors;
  };

  const handleStartSimulation = () => {
    // バリデーション実行
    const validationErrors = validateSimulationData();
    
    if (validationErrors.length > 0) {
      alert("以下の項目を確認してください：\n\n" + validationErrors.join("\n"));
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + simulationPeriod);

    // 有効な売買条件のみを送信
    const validConditions = tradingConditions.filter(condition => 
      condition.type && condition.metric && condition.value && condition.value.trim() !== ''
    );

    // FormDataとして明示的に送信
    const formData = new FormData();
    formData.append("symbol", tickerSymbol.toUpperCase());
    formData.append("companyName", companyName); // 会社名を追加
    formData.append("initialCapital", initialCapital.toString());
    formData.append("startDate", startDate.toISOString().split('T')[0]);
    formData.append("endDate", endDate.toISOString().split('T')[0]);
    formData.append("tradingConditions", JSON.stringify(validConditions));
    

    simulationFetcher.submit(formData, {
      method: "POST",
      action: "/api/simulations"
    });
  };

  // 売買条件の管理関数
  const addTradingCondition = () => {
    setTradingConditions([...tradingConditions, { type: 'buy', metric: 'price', value: '', description: '' }]);
  };

  const removeTradingCondition = (index: number) => {
    if (tradingConditions.length > 1) {
      setTradingConditions(tradingConditions.filter((_, i) => i !== index));
    }
  };

  const updateTradingCondition = (index: number, field: string, value: string) => {
    const updated = [...tradingConditions];
    updated[index] = { ...updated[index], [field]: value };
    setTradingConditions(updated);
  };

  const getConditionTypeLabel = (type: string) => {
    const labels = {
      buy: '購入条件',
      sell: '売却条件'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getMetricLabel = (metric: string) => {
    const labels = {
      price: '価格'
    };
    return labels[metric as keyof typeof labels] || metric;
  };

  const getMetricPlaceholder = (metric: string) => {
    const placeholders = {
      price: '例: 150.00'
    };
    return placeholders[metric as keyof typeof placeholders] || '';
  };

  // ティッカーシンボル変更時の処理
  const handleTickerSymbolChange = (symbol: string) => {
    setTickerSymbol(symbol);
  };

  // 株価情報を取得する処理
  const fetchStockInfo = () => {
    if (tickerSymbol.length >= 1) {
      let symbolToFetch = tickerSymbol.toUpperCase();
      
      // 日本株の場合（4桁の数字）、.Tを追加
      if (/^\d{4}$/.test(symbolToFetch)) {
        symbolToFetch = `${symbolToFetch}.T`;
      }
      
      stockInfoFetcher.load(`/api/stock-info?symbol=${symbolToFetch}`);
    }
  };

  // Enterキーで検索
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchStockInfo();
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{fontFamily: 'MS Gothic, monospace'}}>
      <div className="bg-white border border-black w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-2 bg-gray-200 border-b border-black">
          <h2 className="text-sm font-bold text-black">
            新しいシミュレーション開始
          </h2>
          <button
            onClick={handleClose}
            className="bg-gray-400 hover:bg-gray-500 text-black border border-black px-2 py-1 text-xs font-bold"
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                📊 銘柄情報入力
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                投資したい銘柄の情報を入力してください。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ティッカーシンボル <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tickerSymbol}
                      onChange={(e) => handleTickerSymbolChange(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="例: AAPL"
                      className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm"
                    />
                    <button
                      type="button"
                      onClick={fetchStockInfo}
                      disabled={!tickerSymbol.trim() || stockInfoFetcher.state === "loading"}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded font-medium transition-colors whitespace-nowrap text-sm"
                    >
                      {stockInfoFetcher.state === "loading" ? "検索中..." : "🔍"}
                    </button>
                  </div>
                  {stockInfoFetcher.state === "loading" && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      📡 株価情報を取得中...
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    会社名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="例: Apple Inc."
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm"
                  />
                </div>

              </div>

              {/* 株価情報表示 */}
              {stockInfoFetcher.data && !stockInfoFetcher.data.error && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-green-900 dark:text-green-100 text-sm">
                      📊 株価情報
                    </h4>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      更新: {stockInfoFetcher.data.marketTimeFormatted}
                    </div>
                  </div>
                  
                  {/* 価格情報（シンプル版） */}
                  <div className="mb-3">
                    <p className="text-green-700 dark:text-green-300 font-medium text-sm">現在価格</p>
                    <p className="text-green-900 dark:text-green-100 font-bold text-xl">
                      {(stockInfoFetcher.data.currency === 'JPY' ? '¥' : '$')}{stockInfoFetcher.data.regularMarketPrice?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                  
                  {/* 価格チャート */}
                  {stockInfoFetcher.data.chartData && stockInfoFetcher.data.chartData.length > 0 && (
                    <div className="mt-3">
                      <StockChart 
                        chartData={stockInfoFetcher.data.chartData}
                        currency={stockInfoFetcher.data.currency}
                        height="400px"
                        symbol={stockInfoFetcher.data.symbol}
                      />
                    </div>
                  )}
                  
                  {/* シミュレーション設定フォーム */}
                  <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3 text-sm">
                      🎯 シミュレーション設定
                    </h4>
                    
                    <div className="space-y-3">
                      {/* 初期資本・投資期間設定（一行） */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-blue-700 dark:text-blue-300">
                            初期資本:
                          </label>
                          <input
                            type="number"
                            value={initialCapital}
                            onChange={(e) => setInitialCapital(Number(e.target.value))}
                            className="w-20 px-2 py-1 border border-blue-300 dark:border-blue-600 rounded text-xs bg-white dark:bg-gray-800 text-blue-900 dark:text-blue-100"
                            min="1000"
                            step="1000"
                          />
                          <span className="text-xs text-blue-600 dark:text-blue-400">円</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-blue-700 dark:text-blue-300">
                            投資期間:
                          </label>
                          <select 
                            value={simulationPeriod}
                            onChange={(e) => setSimulationPeriod(Number(e.target.value))}
                            className="px-2 py-1 border border-blue-300 dark:border-blue-600 rounded text-xs bg-white dark:bg-gray-800 text-blue-900 dark:text-blue-100"
                          >
                            <option value={1}>1ヶ月</option>
                            <option value={3}>3ヶ月</option>
                            <option value={6}>6ヶ月</option>
                            <option value={12}>1年</option>
                          </select>
                        </div>
                      </div>

                      {/* 売買条件設定 */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
                          📊 売買条件設定 <span className="text-red-500">*</span>
                        </h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                          購入・売却の条件を設定します。複数の条件を設定できます。<span className="text-red-500 font-medium">（必須）</span>
                        </p>
                        
                        <div className="space-y-3">
                          {tradingConditions.map((condition, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                              <span className="text-xs font-bold text-blue-800 dark:text-blue-200 min-w-[40px]">
                                条件{index + 1}
                              </span>
                              
                              <select
                                value={condition.type}
                                onChange={(e) => updateTradingCondition(index, 'type', e.target.value)}
                                className="px-1 py-0.5 border border-blue-300 dark:border-blue-600 rounded text-xs bg-white dark:bg-blue-800 dark:text-white"
                              >
                                <option value="buy">購入</option>
                                <option value="sell">売却</option>
                              </select>

                              <select
                                value={condition.metric}
                                onChange={(e) => updateTradingCondition(index, 'metric', e.target.value)}
                                className="px-1 py-0.5 border border-blue-300 dark:border-blue-600 rounded text-xs bg-white dark:bg-blue-800 dark:text-white"
                              >
                                <option value="price">価格</option>
                              </select>

                              <input
                                type="text"
                                value={condition.value}
                                onChange={(e) => updateTradingCondition(index, 'value', e.target.value)}
                                placeholder={getMetricPlaceholder(condition.metric)}
                                className="px-1 py-0.5 border border-blue-300 dark:border-blue-600 rounded text-xs bg-white dark:bg-blue-800 dark:text-white w-16"
                              />

                              <input
                                type="text"
                                value={condition.description || ''}
                                onChange={(e) => updateTradingCondition(index, 'description', e.target.value)}
                                placeholder="説明"
                                className="px-1 py-0.5 border border-blue-300 dark:border-blue-600 rounded text-xs bg-white dark:bg-blue-800 dark:text-white flex-1"
                              />

                              {tradingConditions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeTradingCondition(index)}
                                  className="text-red-500 hover:text-red-700 text-xs px-1 py-0.5"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="mt-3">
                          <button
                            onClick={addTradingCondition}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                          >
                            + 条件を追加
                          </button>
                        </div>

                        {/* 条件の説明 */}
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                            📝 条件タイプの説明
                          </h5>
                          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                            <div><strong>購入条件:</strong> 株価が条件を満たした時に購入を検討</div>
                            <div><strong>売却条件:</strong> 株価が条件を満たした時に売却を検討（利確・損切り含む）</div>
                          </div>
                        </div>
                      </div>

                      {/* シミュレーション開始ボタン */}
                      <div className="pt-4 border-t border-blue-200 dark:border-blue-700">
                        <button
                          type="button"
                          onClick={handleStartSimulation}
                          disabled={simulationFetcher.state === "submitting"}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                          {simulationFetcher.state === "submitting" ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              シミュレーション作成中...
                            </>
                          ) : (
                            <>
                              🚀 シミュレーション開始
                            </>
                          )}
                        </button>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center">
                          初期チェックポイントが自動作成されます
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {stockInfoFetcher.data?.error && (
                <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-red-700 dark:text-red-300 text-sm">
                    ⚠️ {stockInfoFetcher.data.error}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}