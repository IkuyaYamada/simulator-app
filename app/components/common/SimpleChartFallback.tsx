import React from 'react';

interface SimpleChartProps {
  chartData: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  currency?: string;
  height?: string;
  width?: string;
}

export function SimpleChartFallback({ 
  chartData, 
  currency = 'USD', 
  height = '600px', 
  width = '100%' 
}: SimpleChartProps) {
  const currencySymbol = currency === 'JPY' ? '¥' : '$';

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
            <div>データがありません</div>
          </div>
        </div>
      </div>
    );
  }

  // Get price range for scaling
  const prices = chartData.flatMap(d => [d.high, d.low, d.open, d.close]);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice;

  // Simple line chart using SVG
  const width_num = 600; // Fixed width for calculation
  const height_num = 400; // Fixed height for chart area
  const padding = 40;

  const xStep = (width_num - 2 * padding) / (chartData.length - 1);
  
  const getY = (price: number) => {
    return height_num - padding - ((price - minPrice) / priceRange) * (height_num - 2 * padding);
  };

  // Generate path for close price line
  const closePath = chartData.map((d, i) => {
    const x = padding + i * xStep;
    const y = getY(d.close);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Sample some data points for display
  const samplePoints = chartData.filter((_, i) => i % Math.max(1, Math.floor(chartData.length / 10)) === 0);

  return (
    <div style={{ width, height }}>
      <div className="bg-white p-4 border rounded-lg" style={{ width: '100%', height: '100%' }}>
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">株価チャート（簡易表示）</h3>
          <p className="text-sm text-gray-600">
            高度なチャートが読み込めないため、簡易表示を使用しています
          </p>
        </div>
        
        <div className="mb-4">
          <svg width="100%" height="400" viewBox={`0 0 ${width_num} ${height_num}`}>
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="50" height="40" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Price line */}
            <path
              d={closePath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
            />
            
            {/* Data points */}
            {chartData.map((d, i) => {
              if (i % Math.max(1, Math.floor(chartData.length / 20)) !== 0) return null;
              const x = padding + i * xStep;
              const y = getY(d.close);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="#10b981"
                />
              );
            })}
            
            {/* Y-axis labels */}
            <text x="10" y={getY(maxPrice)} textAnchor="start" fontSize="12" fill="#6b7280">
              {currencySymbol}{maxPrice.toFixed(0)}
            </text>
            <text x="10" y={getY(minPrice) + 5} textAnchor="start" fontSize="12" fill="#6b7280">
              {currencySymbol}{minPrice.toFixed(0)}
            </text>
          </svg>
        </div>

        {/* Data table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">日付</th>
                <th className="text-right p-2">始値</th>
                <th className="text-right p-2">高値</th>
                <th className="text-right p-2">安値</th>
                <th className="text-right p-2">終値</th>
                <th className="text-right p-2">出来高</th>
              </tr>
            </thead>
            <tbody>
              {samplePoints.slice(0, 10).map((d, i) => (
                <tr key={i} className="border-b text-xs">
                  <td className="p-2">{d.date}</td>
                  <td className="p-2 text-right">{currencySymbol}{d.open.toFixed(2)}</td>
                  <td className="p-2 text-right text-red-600">{currencySymbol}{d.high.toFixed(2)}</td>
                  <td className="p-2 text-right text-blue-600">{currencySymbol}{d.low.toFixed(2)}</td>
                  <td className="p-2 text-right font-medium">{currencySymbol}{d.close.toFixed(2)}</td>
                  <td className="p-2 text-right">{d.volume.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          表示データ: 最新 {samplePoints.length} 件 / 全 {chartData.length} 件
        </div>
      </div>
    </div>
  );
}