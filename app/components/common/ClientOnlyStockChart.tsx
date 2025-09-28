import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { SimpleChartFallback } from './SimpleChartFallback';

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
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Dynamically import the StockChart component with timeout
    const timeoutId = setTimeout(() => {
      setLoadFailed(true);
    }, 10000); // 10 second timeout

    import('./StockChart').then((module) => {
      clearTimeout(timeoutId);
      setStockChart(() => module.StockChart);
    }).catch((error) => {
      clearTimeout(timeoutId);
      console.error('Failed to load StockChart:', error);
      setLoadFailed(true);
    });

    return () => clearTimeout(timeoutId);
  }, []);

  // Show loading state during SSR and initial hydration
  if (!isClient) {
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
          <div className="text-xs text-gray-500 mt-1">クライアントサイド準備中...</div>
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

  // If loading failed or timed out, use fallback
  if (loadFailed || (!StockChart && isClient)) {
    console.log('Using fallback chart due to loading failure');
    return <SimpleChartFallback {...props} />;
  }

  // Still loading
  if (!StockChart) {
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
          <div className="text-xl mb-2">⏳</div>
          <div>高度なチャートを読み込み中...</div>
        </div>
      </div>
    );
  }

  return <StockChart {...props} />;
}