import { useState, useEffect } from 'react';
import { useFetcher } from 'react-router';

interface TradingConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulationId: string;
  checkpointId?: string;
  existingConditions?: any[];
  stockData?: any;
}

interface TradingCondition {
  type: 'buy' | 'sell';
  metric: 'price';
  value: string;
  description?: string;
}

export function TradingConditionsModal({
  isOpen,
  onClose,
  simulationId,
  checkpointId,
  existingConditions = [],
  stockData
}: TradingConditionsModalProps) {
  // 初期条件を生成する関数
  const getInitialConditions = (): TradingCondition[] => {
    if (existingConditions.length > 0) {
      return existingConditions.map(c => ({
        type: c.type,
        metric: c.metric,
        value: c.value,
        description: c.description || ''
      }));
    }

    // 株価情報がある場合は前日終値を設定
    if (stockData?.previousClose) {
      return [
        {
          type: 'buy',
          metric: 'price',
          value: stockData.previousClose.toFixed(2),
          description: '前日終値での購入'
        },
        {
          type: 'sell',
          metric: 'price',
          value: (stockData.previousClose * 1.2).toFixed(2),
          description: '20%上昇時の利確'
        },
        {
          type: 'sell',
          metric: 'price',
          value: (stockData.previousClose * 0.9).toFixed(2),
          description: '10%下落時の損切り'
        }
      ];
    }

    // 株価情報がない場合は空の条件
    return [
      { type: 'buy', metric: 'price', value: '', description: '前日終値での購入' },
      { type: 'sell', metric: 'price', value: '', description: '20%上昇時の利確' },
      { type: 'sell', metric: 'price', value: '', description: '10%下落時の損切り' }
    ];
  };

  const [conditions, setConditions] = useState<TradingCondition[]>([]);
  
  const fetcher = useFetcher();

  // モーダルが開かれた時に初期条件を設定
  useEffect(() => {
    if (isOpen) {
      const initialConditions = getInitialConditions();
      setConditions(initialConditions);
    }
  }, [isOpen, stockData, existingConditions.length]);

  if (!isOpen) return null;

  const addCondition = () => {
    setConditions([...conditions, { type: 'buy', metric: 'price', value: '', description: '' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: keyof TradingCondition, value: string) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append('simulationId', simulationId);
    if (checkpointId) {
      formData.append('checkpointId', checkpointId);
    }
    formData.append('conditions', JSON.stringify(conditions));

    fetcher.submit(formData, {
      method: 'POST',
      action: '/api/conditions'
    });
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

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50" style={{fontFamily: 'MS Gothic, monospace'}}>
      <div className="bg-gray-100 border-2 border-gray-400 w-full max-w-4xl max-h-[90vh] overflow-y-auto" style={{boxShadow: 'inset 1px 1px 0px #fff, inset -1px -1px 0px #808080'}}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4 bg-gray-300 border border-gray-500 p-2">
            <h2 className="text-lg font-bold text-black">
              売買条件設定
            </h2>
            <button
              onClick={onClose}
              className="bg-gray-400 hover:bg-gray-500 text-black border border-gray-600 px-2 py-1 text-sm font-bold"
            >
              ×
            </button>
          </div>

        <div className="space-y-2">
          {conditions.map((condition, index) => (
            <div key={index} className="border border-gray-500 bg-white p-3">
              <div className="flex justify-between items-center mb-2 bg-gray-200 border border-gray-400 p-1">
                <h3 className="font-bold text-black text-sm">
                  条件 {index + 1}
                </h3>
                {conditions.length > 1 && (
                  <button
                    onClick={() => removeCondition(index)}
                    className="bg-red-400 hover:bg-red-500 text-black border border-red-600 px-2 py-1 text-xs font-bold"
                  >
                    削除
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {/* 条件タイプ */}
                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    条件タイプ
                  </label>
                  <select
                    value={condition.type}
                    onChange={(e) => updateCondition(index, 'type', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-600 bg-white text-black text-sm"
                  >
                    <option value="buy">購入条件</option>
                    <option value="sell">売却条件</option>
                  </select>
                </div>

                {/* 指標 */}
                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    指標
                  </label>
                  <select
                    value={condition.metric}
                    onChange={(e) => updateCondition(index, 'metric', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-600 bg-white text-black text-sm"
                  >
                    <option value="price">価格</option>
                  </select>
                </div>

                {/* 値 */}
                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    値
                  </label>
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) => updateCondition(index, 'value', e.target.value)}
                    placeholder={getMetricPlaceholder(condition.metric)}
                    className="w-full px-2 py-1 border border-gray-600 bg-white text-black text-sm"
                  />
                </div>

                {/* 説明 */}
                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    説明（任意）
                  </label>
                  <input
                    type="text"
                    value={condition.description || ''}
                    onChange={(e) => updateCondition(index, 'description', e.target.value)}
                    placeholder="条件の詳細説明"
                    className="w-full px-2 py-1 border border-gray-600 bg-white text-black text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-3 bg-gray-200 border border-gray-400 p-2">
          <button
            onClick={addCondition}
            className="bg-green-400 hover:bg-green-500 text-black border border-green-600 px-3 py-1 text-sm font-bold"
          >
            + 条件を追加
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="bg-gray-400 hover:bg-gray-500 text-black border border-gray-600 px-3 py-1 text-sm font-bold"
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              disabled={fetcher.state === 'submitting'}
              className="bg-blue-400 hover:bg-blue-500 text-black border border-blue-600 px-3 py-1 text-sm font-bold disabled:opacity-50"
            >
              {fetcher.state === 'submitting' ? '保存中...' : '保存'}
            </button>
          </div>
        </div>

        {/* 条件の説明 */}
        <div className="mt-3 p-2 bg-gray-200 border border-gray-400">
          <h4 className="font-bold text-black mb-1 text-sm">
            条件タイプの説明
          </h4>
          <div className="text-xs text-black space-y-1">
            <div><strong>購入条件:</strong> 株価が条件を満たした時に購入を検討</div>
            <div><strong>売却条件:</strong> 株価が条件を満たした時に売却を検討（利確・損切り含む）</div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
