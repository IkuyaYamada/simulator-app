import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

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

interface ClientOnlyStockChartProps extends StockChartProps {}

export function ClientOnlyStockChart(props: ClientOnlyStockChartProps) {
  const [isClient, setIsClient] = useState(false);
  const [StockChart, setStockChart] = useState<ComponentType<StockChartProps> | null>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Dynamically import the StockChart component
    import('./StockChart').then((module) => {
      setStockChart(() => module.StockChart);
    }).catch((error) => {
      console.error('Failed to load StockChart:', error);
    });
  }, []);

  // Show loading state during SSR and initial hydration
  if (!isClient || !StockChart) {
    return (
      <div 
        style={{ 
          width: props.width || '100%', 
          height: props.height || '600px',
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
          <div>チャートを読み込み中...</div>
          {!isClient && <div className="text-xs text-gray-500 mt-1">クライアントサイド準備中...</div>}
        </div>
      </div>
    );
  }

  // Validate data before rendering
  if (!props.chartData || props.chartData.length === 0) {
    return (
      <div 
        style={{ 
          width: props.width || '100%', 
          height: props.height || '600px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '0.375rem'
        }}
      >
        <div className="text-center text-gray-600">
          <div className="text-xl mb-2">📈</div>
          <div>データがありません</div>
        </div>
      </div>
    );
  }

  return <StockChart {...props} />;
}