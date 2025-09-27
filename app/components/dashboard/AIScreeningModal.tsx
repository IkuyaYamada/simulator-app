import React, { useState } from "react";
import { useFetcher } from "react-router";

interface AIScreeningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIScreeningModal({
  isOpen,
  onClose,
}: AIScreeningModalProps) {
  const [currentStep, setCurrentStep] = useState(1); // 1: 銘柄検索, 2: AI分析, 3: シミュレーション設定
  const [searchKeywords, setSearchKeywords] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [selectedStock, setSelectedStock] = useState<any>(null);
  
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

  // シミュレーション作成成功時の処理
  React.useEffect(() => {
    if (simulationFetcher.data && simulationFetcher.data.success) {
      onClose();
      // ページをリロードして新しいシミュレーションを表示
      window.location.reload();
    }
  }, [simulationFetcher.data, onClose]);

  if (!isOpen) return null;

  const handleClose = () => {
    setCurrentStep(1);
    setSearchKeywords("");
    setAiResponse("");
    setSelectedStock(null);
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

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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

  // シミュレーション開始前のバリデーション
  const validateSimulationData = () => {
    const errors = [];

    // 売買条件のチェック
    const validConditions = tradingConditions.filter(condition => 
      condition.type && condition.metric && condition.value && condition.value.trim() !== ''
    );
    
    if (validConditions.length === 0) {
      errors.push("少なくとも1つの売買条件を設定してください");
    }

    // AI分析結果のチェック
    if (!searchKeywords.trim()) {
      errors.push("投資仮説（検索キーワード）を入力してください");
    }
    if (!aiResponse.trim()) {
      errors.push("AI分析結果を入力してください");
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
    formData.append("symbol", "AI_SCREENING"); // AI銘柄スクリーニングの場合は特別なシンボル
    formData.append("initialCapital", initialCapital.toString());
    formData.append("startDate", startDate.toISOString().split('T')[0]);
    formData.append("endDate", endDate.toISOString().split('T')[0]);
    formData.append("tradingConditions", JSON.stringify(validConditions));
    formData.append("simulationType", "ai-screening");
    formData.append("searchKeywords", searchKeywords);
    formData.append("aiResponse", aiResponse);

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
    setTradingConditions(prev => 
      prev.map((condition, i) => 
        i === index ? { ...condition, [field]: value } : condition
      )
    );
  };

  const getMetricPlaceholder = (metric: string) => {
    switch (metric) {
      case 'price': return '価格を入力';
      default: return '値を入力';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{fontFamily: 'MS Gothic, monospace'}}>
      <div className="bg-white border border-black w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-2 bg-gray-200 border-b border-black">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-black">
              AI銘柄スクリーニング
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-6 h-6 bg-red-400 hover:bg-red-500 text-black border border-red-600 flex items-center justify-center text-xs font-bold"
          >
            ×
          </button>
        </div>

        {/* ステップインジケーター */}
        {currentStep > 0 && (
          <div className="px-2 py-1 bg-gray-200 border-b border-black">
            <div className="flex items-center justify-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-6 h-6 border-2 border-gray-600 flex items-center justify-center text-xs font-bold ${
                      step <= currentStep
                        ? "bg-blue-400 text-black border-blue-600"
                        : "bg-gray-300 text-black border-gray-500"
                    }`}
                  >
                    {step}
                  </div>
                  <span
                    className={`ml-1 text-xs font-bold ${
                      step <= currentStep
                        ? "text-black"
                        : "text-gray-600"
                    }`}
                  >
                    {step === 1 && "銘柄検索"}
                    {step === 2 && "AI分析"}
                    {step === 3 && "売買条件設定"}
                  </span>
                  {step < 3 && (
                    <div
                      className={`w-6 h-0.5 mx-2 ${
                        step < currentStep
                          ? "bg-blue-400"
                          : "bg-gray-400"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">

          {currentStep === 1 && (
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
                    検索キーワード <span className="text-red-500">*</span>
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

          {currentStep === 2 && (
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
                    AI分析結果 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={aiResponse}
                    onChange={(e) => setAiResponse(e.target.value)}
                    placeholder="AIからの分析結果をここに貼り付けてください..."
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    AI回答を貼り付けると、システムが自動的に銘柄情報を抽出します。<br/>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">次のステップで売買条件を設定します。</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  ⚙️ シミュレーション設定・売買条件
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  AI分析結果を元に、シミュレーションの詳細設定と売買条件を設定します。
                </p>

                {/* AI分析結果の表示 */}
                {aiResponse && (
                  <div className="p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      📊 AI分析結果
                    </h4>
                    <div className="text-sm text-blue-700 dark:text-blue-300 max-h-32 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{aiResponse.substring(0, 500)}{aiResponse.length > 500 ? '...' : ''}</pre>
                    </div>
                  </div>
                )}

                {/* シミュレーション設定フォーム */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
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
                          className="px-2 py-1 border border-blue-300 dark:border-blue-600 rounded text-xs bg-white dark:bg-blue-800 dark:text-white"
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
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleBack}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            戻る
          </button>

          <div className="flex gap-3">
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !searchKeywords.trim()) ||
                  (currentStep === 2 && !aiResponse.trim())
                }
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 px-6 rounded-lg font-medium transition-colors"
              >
                次へ
              </button>
            ) : (
              <button
                onClick={handleStartSimulation}
                disabled={simulationFetcher.state === "submitting"}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 px-6 rounded-lg font-medium transition-colors"
              >
                {simulationFetcher.state === "submitting" ? "作成中..." : "シミュレーション開始"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
