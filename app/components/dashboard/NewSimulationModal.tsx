import React, { useState } from "react";

interface NewSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewSimulationModal({
  isOpen,
  onClose,
}: NewSimulationModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [searchKeywords, setSearchKeywords] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [selectedStock, setSelectedStock] = useState<any>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setCurrentStep(1);
    setSearchKeywords("");
    setAiResponse("");
    setSelectedStock(null);
    onClose();
  };

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
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
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((step) => (
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
            ))}
          </div>
        </div>

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

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  ⚙️ シミュレーション設定
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  AI分析結果を元に、シミュレーションの詳細設定を行います。
                </p>

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
            onClick={currentStep === 1 ? handleClose : handleBack}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            {currentStep === 1 ? "キャンセル" : "戻る"}
          </button>

          <div className="flex gap-3">
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                disabled={currentStep === 1 && !searchKeywords.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 px-6 rounded-lg font-medium transition-colors"
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
