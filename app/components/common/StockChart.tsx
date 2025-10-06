import React from 'react';

interface StockChartProps {
  chartData: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    ma5?: number;
    ma10?: number;
    ma20?: number;
    ma30?: number;
  }>;
  currency?: string;
  height?: string;
  width?: string;
  tradingConditions?: Array<{
    type: 'buy' | 'sell';
    metric: 'price';
    value: string;
    description?: string;
  }>;
  symbol?: string;
}

export function StockChart({ 
  chartData, 
  currency = 'USD', 
  height = '600px', 
  width = '100%',
  tradingConditions = [],
  symbol
}: StockChartProps) {
  const currencySymbol = currency === 'JPY' ? '¥' : '$';
  
  const formatValue = (val: number) => `${currencySymbol}${val?.toFixed(2) || 'N/A'}`;

  // Early return if no data
  if (!chartData || chartData.length === 0) {
    return (
      <div style={{ width, height }}>
        <div 
          style={{ 
            width: '100%', 
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem'
          }}
        >
          <div className="text-center text-gray-600">
            <div className="text-xl mb-2">📊</div>
            <div>チャートデータがありません</div>
          </div>
        </div>
      </div>
    );
  }

  // Lazy load ReactECharts with error handling
  const [ReactECharts, setReactECharts] = React.useState<any>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    // Dynamic import with error handling
    import('echarts-for-react')
      .then((module) => {
        if (isMounted) {
          setReactECharts(() => module.default);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error('Failed to load ECharts:', error);
        if (isMounted) {
          setLoadError('チャートライブラリの読み込みに失敗しました');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div style={{ width, height }}>
        <div 
          style={{ 
            width: '100%', 
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem'
          }}
        >
          <div className="text-center text-gray-600">
            <div className="text-xl mb-2">⏳</div>
            <div>チャートを読み込み中...</div>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !ReactECharts) {
    return (
      <div style={{ width, height }}>
        <div 
          style={{ 
            width: '100%', 
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem'
          }}
        >
          <div className="text-center text-red-600">
            <div className="text-xl mb-2">⚠️</div>
            <div>{loadError || 'チャートライブラリの読み込みエラー'}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
            >
              再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 売却条件の線を生成
  const generateTradingConditionLines = () => {
    if (!tradingConditions || tradingConditions.length === 0) return [];
    
    const lines: any[] = [];
    
    tradingConditions.forEach((condition, index) => {
      if (condition.type === 'sell' && condition.metric === 'price' && condition.value) {
        const price = parseFloat(condition.value);
        if (!isNaN(price)) {
          lines.push({
            name: `売却条件${index + 1}: ${condition.description || '売却'}`,
            type: 'line',
            xAxisIndex: 0,
            yAxisIndex: 0,
            data: chartData.map(() => price),
            lineStyle: { 
              color: '#ff6b6b', 
              width: 2,
              type: 'dashed'
            },
            symbol: 'none',
            tooltip: {
              formatter: () => {
                return `${condition.description || '売却条件'}: ${formatValue(price)}`;
              }
            }
          });
        }
      }
    });
    
    return lines;
  };

  // 日本株の場合の参考URLを生成
  const getReferenceUrl = () => {
    if (currency === 'JPY' && symbol) {
      // ティッカーシンボルが4桁の数字の場合（日本株の証券コード）
      if (/^\d{4}$/.test(symbol)) {
        return `https://www.nikkei.com/smartchart/?code=${symbol}`;
      }
    }
    return null;
  };

  const referenceUrl = getReferenceUrl();

  const option = (() => {
    try {
      return {
        // パフォーマンス向上のレンダリング設定
        lazyUpdate: true,
        hoverLayerThreshold: 10000,
        animation: false,
    
    grid: [
      {
        left: '10%',
        right: '8%',
        top: '15%',
        height: '50%'
      },
      {
        left: '10%',
        right: '8%',
        bottom: '12%',
        height: '18%'
      }
    ],
    xAxis: [
      {
        type: 'category',
        gridIndex: 0,
        data: chartData.map(data => data.date),
        axisTick: {
          alignWithLabel: true
        },
        splitLine: {
          show: false
        }
      },
      {
        type: 'category',
        gridIndex: 1,
        data: chartData.map(data => data.date),
        axisTick: {
          alignWithLabel: true
        },
        splitLine: {
          show: false
        }
      }
    ],
    yAxis: [
      {
        type: 'value',
        gridIndex: 0,
        scale: true,
        minInterval: 0.01,
        axisLabel: {
          formatter: (value: number) => {
            return Math.round(value).toString();
          }
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#e5e7eb'
          }
        }
      },
      {
        type: 'value',
        gridIndex: 1,
        scale: true,
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 1000000) {
              return `${Math.round(value / 1000000)}M`;
            } else if (value >= 1000) {
              return `${Math.round(value / 1000)}K`;
            }
            return Math.round(value).toString();
          }
        },
        splitLine: {
          show: false
        }
      }
    ],
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
      show: true,
      formatter: (params: any) => {
        if (!Array.isArray(params)) return '';
        
        const param = params[0];
        const dataIndex = param.dataIndex;
        
        // 元のchartDataから直接値を取得（配列の順序に依存しない）
        const originalData = chartData[dataIndex];
        
        let result = `<div>日付: ${param.axisValue}</div>`;
        if (originalData) {
          const open = Number(originalData.open);
          const close = Number(originalData.close);
          const high = Number(originalData.high);
          const low = Number(originalData.low);
          
          result += `<div>始値: ${formatValue(open)}<br/>終値: ${formatValue(close)}<br/>高値: ${formatValue(high)}<br/>安値: ${formatValue(low)}</div>`;
        } else {
          result += `<div>データなし</div>`;
        }
        
        return result;
      }
    },
    legend: {
      top: 10,
      left: 'center',
      data: [
        'ローソク足', 
        'MA5', 
        'MA10', 
        'MA20', 
        'MA30', 
        '取引高',
        ...generateTradingConditionLines().map(line => line.name)
      ]
    },
    series: [
      // ローソク足
      {
        name: 'ローソク足',
        type: 'candlestick',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: chartData
          .filter((data) => {
            const open = Number(data.open);
            const close = Number(data.close);
            const high = Number(data.high);
            const low = Number(data.low);
            
            // 基本的な値の存在チェック
            if (!open || !close || !high || !low || 
                isNaN(open) || isNaN(close) || isNaN(high) || isNaN(low)) {
              console.warn('Invalid price data (missing or NaN):', data);
              return false;
            }
            
            // 正の値チェック
            if (open <= 0 || close <= 0 || high <= 0 || low <= 0) {
              console.warn('Invalid price data (non-positive):', data);
              return false;
            }
            
            // ローソク足の整合性チェック
            // 高値 >= max(始値, 終値) && 安値 <= min(始値, 終値)
            if (high < Math.max(open, close) || low > Math.min(open, close)) {
              console.warn('Invalid candlestick data (high/low inconsistency):', {
                open, close, high, low,
                issue: `High (${high}) should be >= max(open, close) (${Math.max(open, close)}), Low (${low}) should be <= min(open, close) (${Math.min(open, close)})`
              });
              return false;
            }
            
            // 異常な価格変動チェック（1日で90%以上の変動は疑わしい）
            if (Math.abs(close - open) / open > 0.9) {
              console.warn('Suspicious price change (>90%):', {
                open, close, change: ((close - open) / open * 100).toFixed(2) + '%'
              });
              return false;
            }
            
            return true;
          })
          .map((data) => [
            Number(data.open),
            Number(data.close),
            Number(data.low),
            Number(data.high)
          ]),
        itemStyle: {
          color: '#10b981',  // 緑（上昇）
          color0: '#ef4444', // 赤（下落）
          borderColor: '#10b981',
          borderColor0: '#ef4444'
        }
      },
      // 移動平均線
      {
        name: 'MA5',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: chartData.map((data) => data.ma5 || null),
        lineStyle: { color: '#ffff00', width: 1 },
        symbol: 'circle',
        symbolSize: 2
      },
      {
        name: 'MA10',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: chartData.map((data) => data.ma10 || null),
        lineStyle: { color: '#ff8000', width: 1 },
        symbol: 'circle',
        symbolSize: 2
      },
      {
        name: 'MA20',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: chartData.map((data) => data.ma20 || null),
        lineStyle: { color: '#8000ff', width: 1 },
        symbol: 'circle',
        symbolSize: 2
      },
      {
        name: 'MA30',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: chartData.map((data) => data.ma30 || null),
        lineStyle: { color: '#808080', width: 1 },
        symbol: 'circle',
        symbolSize: 2
      },
      // 取引高
      {
        name: '取引高',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: chartData.map((data) => data.volume || 0),
        itemStyle: { color: '#87ceeb' }
      },
      // 売却条件の線
      ...generateTradingConditionLines()
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        start: 70,
        end: 100,
        zoomOnMouseWheel: false,
        moveOnMouseMove: true,
        moveOnMouseWheel: false
      },
      {
        show: true,
        xAxisIndex: [0, 1],
        type: 'slider',
        bottom: 5,
        start: 70,
        end: 100,
        zoomOnMouseWheel: false,
        moveOnMouseWheel: false
      }
    ]
  };
    } catch (error) {
      console.error('Error creating chart option:', error);
      return {
        title: {
          text: 'チャートの作成中にエラーが発生しました',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: '#ef4444',
            fontSize: 16
          }
        }
      };
    }
  })();

  return (
    <div style={{ width }}>
      <div style={{ height }}>
        {/* Add safety check for chartData */}
        {chartData && chartData.length > 0 && ReactECharts ? (
          <ReactECharts 
            option={option}
            style={{ width: '100%', height: '100%' }}
            notMerge={true}
            lazyUpdate={false}
            opts={{
              renderer: 'canvas', // Force canvas renderer for better compatibility
              useDirtyRect: false  // Disable dirty rect optimization that might cause issues
            }}
          />
        ) : (
          <div 
            style={{ 
              width: '100%', 
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem'
            }}
          >
            <div className="text-center text-gray-600">
              <div className="text-xl mb-2">📊</div>
              <div>チャートデータがありません</div>
            </div>
          </div>
        )}
      </div>
      {referenceUrl && (
        <div className="mt-2 text-sm text-gray-600">
          <span className="mr-2">参考:</span>
          <a 
            href={referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            日経会社情報 - {symbol}
          </a>
        </div>
      )}
    </div>
  );
}
