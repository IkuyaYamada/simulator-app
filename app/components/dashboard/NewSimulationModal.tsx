import React, { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import ReactECharts from 'echarts-for-react';

interface NewSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewSimulationModal({
  isOpen,
  onClose,
}: NewSimulationModalProps) {
  const [currentStep, setCurrentStep] = useState(0); // 0: 選択画面, 1: AI銘柄スクリーニング, 2: 銘柄指定, 3: シミュレーション設定
  const [searchKeywords, setSearchKeywords] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [simulationType, setSimulationType] = useState<'ai-screening' | 'preset-stock' | null>(null);
  
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

  // 株価情報取得結果の処理
  useEffect(() => {
    if (stockInfoFetcher.data && !stockInfoFetcher.data.error) {
      const stockData = stockInfoFetcher.data;
      setCompanyName(stockData.longName || stockData.shortName || "");
      setIndustry(stockData.industry || stockData.sector || "");
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
    setCurrentStep(0);
    setSearchKeywords("");
    setAiResponse("");
    setSelectedStock(null);
    setSimulationType(null);
    setTickerSymbol("");
    setCompanyName("");
    setIndustry("");
    setInitialCapital(1000000);
    setSimulationPeriod(3);
    onClose();
  };

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep === 1 && simulationType === 'ai-screening') {
      setCurrentStep(0);
    } else if (currentStep === 2 && simulationType === 'preset-stock') {
      setCurrentStep(0);
    } else if (currentStep === 3) {
      setCurrentStep(simulationType === 'ai-screening' ? 1 : 2);
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSelectSimulationType = (type: 'ai-screening' | 'preset-stock') => {
    setSimulationType(type);
    setCurrentStep(type === 'ai-screening' ? 1 : 2);
  };

  const handleStartSimulation = () => {
    if (!tickerSymbol || !stockInfoFetcher.data) {
      alert("銘柄情報が取得できていません");
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + simulationPeriod);

    // FormDataとして明示的に送信
    const formData = new FormData();
    formData.append("symbol", tickerSymbol.toUpperCase());
    formData.append("initialCapital", initialCapital.toString());
    formData.append("startDate", startDate.toISOString().split('T')[0]);
    formData.append("endDate", endDate.toISOString().split('T')[0]);

    simulationFetcher.submit(formData, {
      method: "POST",
      action: "/api/simulations"
    });
  };

  // ティッカーシンボル変更時の処理
  const handleTickerSymbolChange = (symbol: string) => {
    setTickerSymbol(symbol);
  };

  // 株価情報を取得する処理
  const fetchStockInfo = () => {
    if (tickerSymbol.length >= 1) {
      stockInfoFetcher.load(`/api/stock-info?symbol=${tickerSymbol.toUpperCase()}`);
    }
  };

  // Enterキーで検索
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchStockInfo();
    }
  };

  const generateAIPrompt = (keywords: string) => {
    return `
投資分析をお願いします。

【検索条件】
キーワード: ${keywords}

【出力形式（必ずこの形式で回答してください）】

## 分析結果

### 1. 推奨銘柄
**銘柄1:**
- ティッカー: [例: AAPL]
- 会社名: [例: Apple Inc.]
- 業界: [例: テクノロジー/コンシューマーエレクトロニクス]
- 投資推奨度: [1-5]/5

### 2. 投資分析

**ポジティブ要因:**
- [要因1]
- [要因2]
- [要因3]

**リスク要因:**
- [リスク1]
- [リスク2]
- [リスク3]

**投資仮説:**
[6ヶ月〜1年の投資戦略と期待される価格変動の理由]

### 3. 総合評価
**最も推奨する銘柄:** [ティッカーシンボル]
**理由:** [簡潔な理由]
**推奨投資期間:** [例: 6ヶ月〜1年]

【注意事項】
- ティッカーシンボルは必ず大文字の英字で記載
- 投資推奨度は1-5の数値で評価
- 具体的な数値やデータに基づいた分析
- リスクとリターンの両面から評価
`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            新しいシミュレーション開始
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ステップインジケーター */}
        {currentStep > 0 && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center space-x-4">
              {simulationType === 'ai-screening' ? (
                // AI銘柄スクリーニングのステップ
                [1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step <= currentStep
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {step}
                    </div>
                    <span
                      className={`ml-2 text-sm ${
                        step <= currentStep
                          ? "text-blue-600 dark:text-blue-400 font-medium"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {step === 1 && "銘柄検索"}
                      {step === 2 && "AI分析"}
                      {step === 3 && "シミュレーション設定"}
                    </span>
                    {step < 3 && (
                      <div
                        className={`w-8 h-0.5 mx-4 ${
                          step < currentStep
                            ? "bg-blue-600"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    )}
                  </div>
                ))
              ) : (
                // 銘柄指定のステップ
                [1, 2].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step <= (currentStep - 1)
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {step}
                    </div>
                    <span
                      className={`ml-2 text-sm ${
                        step <= (currentStep - 1)
                          ? "text-green-600 dark:text-green-400 font-medium"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {step === 1 && "銘柄指定"}
                      {step === 2 && "シミュレーション設定"}
                    </span>
                    {step < 2 && (
                      <div
                        className={`w-8 h-0.5 mx-4 ${
                          step < (currentStep - 1)
                            ? "bg-green-600"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  🚀 シミュレーション開始方法を選択
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  どの方法でシミュレーションを開始しますか？
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* AI銘柄スクリーニング */}
                  <div 
                    onClick={() => handleSelectSimulationType('ai-screening')}
                    className="cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-lg"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        AI銘柄スクリーニング
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                        AIが投資テーマを分析して最適な銘柄を提案します
                      </p>
                      <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                        <p>• キーワード検索</p>
                        <p>• AI分析プロンプト生成</p>
                        <p>• 推奨銘柄の選定</p>
                      </div>
                    </div>
                  </div>

                  {/* 銘柄がわかっている場合 */}
                  <div 
                    onClick={() => handleSelectSimulationType('preset-stock')}
                    className="cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-6 hover:border-green-300 dark:hover:border-green-700 transition-all hover:shadow-lg"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                        銘柄がわかっている場合
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                        既に投資したい銘柄が決まっている場合
                      </p>
                      <div className="text-xs text-green-600 dark:text-green-400 space-y-1">
                        <p>• 銘柄情報の直接入力</p>
                        <p>• シミュレーション設定</p>
                        <p>• すぐに開始</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && simulationType === 'ai-screening' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  🔍 銘柄検索
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  投資したい銘柄のキーワードを入力してください。AIが分析用のプロンプトを生成します。
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    検索キーワード
                  </label>
                  <input
                    type="text"
                    value={searchKeywords}
                    onChange={(e) => setSearchKeywords(e.target.value)}
                    placeholder="例: AI関連企業の成長株、半導体、EV関連"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && simulationType === 'ai-screening' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  🤖 AI分析
                </h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    📋 生成されたAIプロンプト
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    以下のプロンプトをコピーして、ChatGPTやClaudeなどのAIサービスに貼り付けてください。
                  </p>
                  <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded p-3 mb-3">
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {generateAIPrompt(searchKeywords)}
                    </pre>
                  </div>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        generateAIPrompt(searchKeywords)
                      )
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
                  >
                    プロンプトをコピー
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    AI分析結果
                  </label>
                  <textarea
                    value={aiResponse}
                    onChange={(e) => setAiResponse(e.target.value)}
                    placeholder="AIからの分析結果をここに貼り付けてください..."
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    AI回答を貼り付けると、システムが自動的に銘柄情報を抽出します。
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && simulationType === 'preset-stock' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  📊 銘柄情報入力
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  投資したい銘柄の情報を入力してください。
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ティッカーシンボル *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tickerSymbol}
                        onChange={(e) => handleTickerSymbolChange(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="例: AAPL"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                      />
                      <button
                        type="button"
                        onClick={fetchStockInfo}
                        disabled={!tickerSymbol.trim() || stockInfoFetcher.state === "loading"}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                      >
                        {stockInfoFetcher.state === "loading" ? "検索中..." : "🔍 検索"}
                      </button>
                    </div>
                    {stockInfoFetcher.state === "loading" && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        📡 株価情報を取得中...
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      会社名 *
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="例: Apple Inc."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      業界（任意）
                    </label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="例: テクノロジー/コンシューマーエレクトロニクス"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>

                {/* 株価情報表示 */}
                {stockInfoFetcher.data && !stockInfoFetcher.data.error && (
                  <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-green-900 dark:text-green-100">
                        📊 株価情報
                      </h4>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        <p>更新: {stockInfoFetcher.data.marketTimeFormatted}</p>
                        <p>市場状態: {stockInfoFetcher.data.marketState}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-green-700 dark:text-green-300 font-medium">現在価格</p>
                <p className="text-green-900 dark:text-green-100 font-bold">
                  {(stockInfoFetcher.data.currency === 'JPY' ? '¥' : '$')}{stockInfoFetcher.data.regularMarketPrice?.toFixed(2) || 'N/A'}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {stockInfoFetcher.data.marketTimeFormatted}
                </p>
              </div>
                      <div>
                        <p className="text-green-700 dark:text-green-300 font-medium">変動額</p>
                        <p className={`font-bold ${
                          (stockInfoFetcher.data.regularMarketChange || 0) >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {stockInfoFetcher.data.regularMarketChange >= 0 ? '+' : ''}
                          {(stockInfoFetcher.data.currency === 'JPY' ? '¥' : '$')}{stockInfoFetcher.data.regularMarketChange?.toFixed(2) || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-green-700 dark:text-green-300 font-medium">変動率</p>
                        <p className={`font-bold ${
                          (stockInfoFetcher.data.regularMarketChangePercent || 0) >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {stockInfoFetcher.data.regularMarketChangePercent >= 0 ? '+' : ''}
                          {(stockInfoFetcher.data.regularMarketChangePercent * 100)?.toFixed(2) || 'N/A'}%
                        </p>
                      </div>
                      <div>
                        <p className="text-green-700 dark:text-green-300 font-medium">取引量</p>
                        <p className="text-green-900 dark:text-green-100 font-bold">
                          {stockInfoFetcher.data.regularMarketVolume?.toLocaleString() || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-green-600 dark:text-green-400">前日終値</p>
                          <p className="text-green-900 dark:text-green-100">
                            {(stockInfoFetcher.data.currency === 'JPY' ? '¥' : '$')}{stockInfoFetcher.data.regularMarketPreviousClose?.toFixed(2) || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-green-600 dark:text-green-400">始値</p>
                          <p className="text-green-900 dark:text-green-100">
                            {(stockInfoFetcher.data.currency === 'JPY' ? '¥' : '$')}{stockInfoFetcher.data.regularMarketOpen?.toFixed(2) || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-green-600 dark:text-green-400">高値・安値</p>
                          <p className="text-green-900 dark:text-green-100">
                            {(stockInfoFetcher.data.currency === 'JPY' ? '¥' : '$')}{stockInfoFetcher.data.regularMarketDayHigh?.toFixed(2) || 'N/A'} / 
                            {(stockInfoFetcher.data.currency === 'JPY' ? '¥' : '$')}{stockInfoFetcher.data.regularMarketDayLow?.toFixed(2) || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-green-600 dark:text-green-400">取引所</p>
                          <p className="text-green-900 dark:text-green-100">
                            {stockInfoFetcher.data.exchange} ({stockInfoFetcher.data.currency})
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-green-600 dark:text-green-400">52週高値</p>
                            <p className="text-green-900 dark:text-green-100">
                              {(stockInfoFetcher.data.currency === 'JPY' ? '¥' : '$')}{stockInfoFetcher.data.fiftyTwoWeekHigh?.toFixed(2) || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-green-600 dark:text-green-400">52週安値</p>
                            <p className="text-green-900 dark:text-green-100">
                              {(stockInfoFetcher.data.currency === 'JPY' ? '¥' : '$')}{stockInfoFetcher.data.fiftyTwoWeekLow?.toFixed(2) || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 価格チャート */}
                    {stockInfoFetcher.data.chartData && stockInfoFetcher.data.chartData.length > 0 && (
                      <div className="mt-4 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <h5 className="font-medium text-green-900 dark:text-green-100 mb-3">
                          📈 過去100日間の価格推移
                        </h5>
                        <div style={{ width: '100%', height: '250px' }}>
                          <ReactECharts 
                            key={`menu-chart-${stockInfoFetcher.data?.symbol}`}
                            notMerge={true}
                            option={{
                              // パフォーマンス向上のレンダリング設定
                              lazyUpdate: true,
                              hoverLayerThreshold: 10000,
                              animation: false,
                              
                              grid: {
                                left: '3%',
                                right: '4%',
                                bottom: '3%',
                                containLabel: true
                              },
                              xAxis: {
                                type: 'category',
                                data: stockInfoFetcher.data.chartData.map((data: any) => data.date),
                                axisTick: {
                                  alignWithLabel: true
                                },
                                splitLine: {
                                  show: false
                                }
                              },
                              yAxis: {
                                type: 'value',
                                scale: true,  // データに合わせて自動スケール調整
                                minInterval: 0.01,  // 最小値間隔を設定
                                axisLabel: {
                                  formatter: (value: number) => {
                                    const currency = stockInfoFetcher.data.currency || 'USD';
                                    const symbol = currency === 'JPY' ? '¥' : '$';
                                    return `${symbol}${value?.toFixed(2)}`;
                                  }
                                },
                                splitLine: {
                                  lineStyle: {
                                    type: 'dashed',
                                    color: '#e5e7eb'
                                  }
                                }
                              },
                              tooltip: {
                                trigger: 'axis',
                                backgroundColor: '#f9fafb',
                                borderColor: '#d1d5db',
                                borderWidth: 1,
                                borderRadius: 6,
                                textStyle: {
                                  color: '#374151',
                                  fontSize: 12
                                },
                                formatter: (params: any) => {
                                  if (!Array.isArray(params)) return '';
                                  
                                  const currency = stockInfoFetcher.data.currency || 'USD';
                                  const symbol = currency === 'JPY' ? '¥' : '$';
                                  const formatValue = (val: number) => `${symbol}${val?.toFixed(2) || 'N/A'}`;
                                  
                                  const param = params[0];
                                  const data = param.data;  // [open, close, low, high]
                                  
                                  let result = `<div>日付: ${param.axisValue}</div>`;
                                  result += data ? 
                                    `<div>開値: ${formatValue(data[0])}<br/>終値: ${formatValue(data[1])}<br/>安値: ${formatValue(data[2])}<br/>高値: ${formatValue(data[3])}</div>` :
                                    `<div>価格: ${formatValue(param.value)}</div>`;
                                  
                                  return result;
                                }
                              },
                              legend: {
                                data: ['ローソク足']
                              },
                              series: [
                                {
                                  name: 'ローソク足',
                                  type: 'candlestick',
                                  data: stockInfoFetcher.data.chartData.map((data: any) => [
                                      data.open || null,
                                      data.close || null,
                                      data.low || null,
                                      data.high || null
                                    ]),
                                  itemStyle: {
                                    color: '#ef4444',  // 赤（下落、陽線）
                                    color0: '#10b981',  // 緑（上昇、陰線）
                                    borderColor: '#ef4444',
                                    borderColor0: '#10b981'
                                  },
                                  sampling: 'average',  // データサンプリング最適化
                                  progressive: 100,     // プログレッシブレンダリング
                                  progressiveChunkMode: 'mod',  // 段階的描画
                                  animation: false      // アニメーション無効
                                }
                              ]
                            }}
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                        <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-0.5 bg-red-500"></div>
                              <span>高値</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-0.5 bg-blue-500"></div>
                              <span>安値</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-0.5 bg-purple-500"></div>
                              <span>始値</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-0.5 bg-green-500"></div>
                              <span>終値</span>
                            </div>
                          </div>
                          <span>※ 過去100日間の日足データ</span>
                        </div>
                      </div>
                    )}
                    
                    {/* シミュレーション設定フォーム */}
                    <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-4">
                        🎯 シミュレーション設定
                      </h4>
                      
                      <div className="space-y-4">
                        {/* 初期資本設定 */}
                        <div>
                          <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                            初期資本
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={initialCapital}
                              onChange={(e) => setInitialCapital(Number(e.target.value))}
                              className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-blue-900 dark:text-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              min="1000"
                              step="1000"
                            />
                            <span className="absolute right-3 top-2 text-blue-600 dark:text-blue-400 text-sm">
                              円
                            </span>
                          </div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            投資可能な上限金額を設定してください
                          </p>
                        </div>

                        {/* 投資期間設定 */}
                        <div>
                          <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                            投資期間
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSimulationPeriod(1)}
                              className={`px-3 py-2 text-sm rounded-md ${
                                simulationPeriod === 1
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600'
                              }`}
                            >
                              1ヶ月
                            </button>
                            <button
                              type="button"
                              onClick={() => setSimulationPeriod(3)}
                              className={`px-3 py-2 text-sm rounded-md ${
                                simulationPeriod === 3
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600'
                              }`}
                            >
                              3ヶ月
                            </button>
                            <button
                              type="button"
                              onClick={() => setSimulationPeriod(6)}
                              className={`px-3 py-2 text-sm rounded-md ${
                                simulationPeriod === 6
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600'
                              }`}
                            >
                              6ヶ月
                            </button>
                            <button
                              type="button"
                              onClick={() => setSimulationPeriod(12)}
                              className={`px-3 py-2 text-sm rounded-md ${
                                simulationPeriod === 12
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600'
                              }`}
                            >
                              1年
                            </button>
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
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  ⚙️ シミュレーション設定
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {simulationType === 'ai-screening' 
                    ? 'AI分析結果を元に、シミュレーションの詳細設定を行います。'
                    : '入力された銘柄情報でシミュレーションの詳細設定を行います。'
                  }
                </p>

                {/* 選択された銘柄情報の表示 */}
                {simulationType === 'preset-stock' && (tickerSymbol || companyName) && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                      📊 選択された銘柄
                    </h4>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      <p><strong>ティッカー:</strong> {tickerSymbol}</p>
                      <p><strong>会社名:</strong> {companyName}</p>
                      {industry && <p><strong>業界:</strong> {industry}</p>}
                    </div>
                    {stockInfoFetcher.data && !stockInfoFetcher.data.error && (
                      <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                        <p className="text-xs text-green-600 dark:text-green-400 mb-1">現在価格</p>
                        <p className="text-lg font-bold text-green-900 dark:text-green-100">
                          ${stockInfoFetcher.data.regularMarketPrice?.toFixed(2) || 'N/A'}
                          <span className={`ml-2 text-sm ${
                            (stockInfoFetcher.data.regularMarketChange || 0) >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            ({stockInfoFetcher.data.regularMarketChange >= 0 ? '+' : ''}
                            ${stockInfoFetcher.data.regularMarketChange?.toFixed(2) || 'N/A'})
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      初期資本
                    </label>
                    <input
                      type="number"
                      placeholder="100000"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      投資期間
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100">
                      <option value="6months">6ヶ月</option>
                      <option value="1year">1年</option>
                      <option value="2years">2年</option>
                      <option value="custom">カスタム</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={currentStep === 0 ? handleClose : handleBack}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            {currentStep === 0 ? "キャンセル" : "戻る"}
          </button>

          <div className="flex gap-3">
            {currentStep === 0 ? (
              // 選択画面では何も表示しない
              null
            ) : currentStep < 3 ? (
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && simulationType === 'ai-screening' && !searchKeywords.trim()) ||
                  (currentStep === 2 && simulationType === 'preset-stock')
                }
                className={`${
                  simulationType === 'ai-screening' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 px-6 rounded-lg font-medium transition-colors`}
              >
                次へ
              </button>
            ) : (
              <button
                onClick={() => {
                  // シミュレーション作成処理
                  handleClose();
                }}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg font-medium transition-colors"
              >
                シミュレーション開始
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
