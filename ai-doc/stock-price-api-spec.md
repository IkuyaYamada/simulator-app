# 株価データAPI仕様

## 概要
ハイブリッド戦略による株価データ取得・管理のAPI仕様書

## 戦略概要
- **シミュレーション作成時**: 必要な期間のデータを一括取得・保存
- **日常運用時**: DBから高速取得、不足時のみAPI呼び出し
- **自動監視時**: 最新価格のみリアルタイム取得

## データベーススキーマ

### StockPrice テーブル
```sql
CREATE TABLE StockPrice (
    stock_price_id UUID PRIMARY KEY,
    stock_id UUID NOT NULL,
    price_date DATE NOT NULL,
    open_price DECIMAL(10,2) NOT NULL,
    close_price DECIMAL(10,2) NOT NULL,
    high_price DECIMAL(10,2) NOT NULL,
    low_price DECIMAL(10,2) NOT NULL,
    volume BIGINT,
    last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_cached BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(stock_id, price_date)
);
```

## APIエンドポイント

### 1. 株価データ取得（単一）

#### GET `/api/stocks/{stockId}/prices/{date}`
指定した銘柄の特定日の株価データを取得

**パラメータ:**
- `stockId` (UUID): 銘柄ID
- `date` (YYYY-MM-DD): 取得日

**レスポンス:**
```json
{
  "stock_price_id": "uuid",
  "stock_id": "uuid",
  "price_date": "2024-01-15",
  "open_price": 150.25,
  "close_price": 152.80,
  "high_price": 153.50,
  "low_price": 149.90,
  "volume": 1250000,
  "last_updated": "2024-01-15T16:00:00Z",
  "is_cached": true
}
```

**動作フロー:**
1. DBから該当日のデータを検索
2. データが存在しない場合、外部APIから取得
3. 取得したデータをDBに保存（キャッシュ）
4. データを返却

### 2. 株価データ一括取得（期間指定）

#### GET `/api/stocks/{stockId}/prices`
指定した銘柄の期間内の株価データを取得

**クエリパラメータ:**
- `start_date` (YYYY-MM-DD): 開始日
- `end_date` (YYYY-MM-DD): 終了日
- `force_refresh` (boolean, optional): 強制更新フラグ

**レスポンス:**
```json
{
  "stock_id": "uuid",
  "prices": [
    {
      "stock_price_id": "uuid",
      "price_date": "2024-01-15",
      "open_price": 150.25,
      "close_price": 152.80,
      "high_price": 153.50,
      "low_price": 149.90,
      "volume": 1250000,
      "last_updated": "2024-01-15T16:00:00Z",
      "is_cached": true
    }
  ],
  "total_count": 252,
  "cached_count": 252,
  "missing_dates": []
}
```

**動作フロー:**
1. 指定期間のDBデータを検索
2. 不足している日付を特定
3. 不足分を外部APIから一括取得
4. 取得したデータをDBに保存
5. 完全なデータセットを返却

### 3. 最新株価取得

#### GET `/api/stocks/{stockId}/prices/latest`
指定した銘柄の最新株価データを取得

**レスポンス:**
```json
{
  "stock_price_id": "uuid",
  "stock_id": "uuid",
  "price_date": "2024-01-15",
  "open_price": 150.25,
  "close_price": 152.80,
  "high_price": 153.50,
  "low_price": 149.90,
  "volume": 1250000,
  "last_updated": "2024-01-15T16:00:00Z",
  "is_cached": false,
  "is_realtime": true
}
```

**動作フロー:**
1. 外部APIから最新価格を取得
2. 取得したデータをDBに保存（キャッシュ）
3. リアルタイムフラグ付きでデータを返却

### 4. シミュレーション用株価データ事前取得

#### POST `/api/simulations/{simulationId}/prefetch-prices`
シミュレーション期間の株価データを事前取得・保存

**リクエストボディ:**
```json
{
  "stock_id": "uuid",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "force_refresh": false
}
```

**レスポンス:**
```json
{
  "simulation_id": "uuid",
  "stock_id": "uuid",
  "fetched_count": 252,
  "cached_count": 0,
  "duration_ms": 1250,
  "status": "completed"
}
```

## 内部処理API

### 5. 株価データキャッシュ管理

#### GET `/api/admin/cache/status`
キャッシュ状況の確認

**レスポンス:**
```json
{
  "total_cached_prices": 125000,
  "oldest_cached_date": "2023-01-01",
  "newest_cached_date": "2024-01-15",
  "cache_size_mb": 12.5,
  "hit_rate_percentage": 85.2
}
```

#### POST `/api/admin/cache/cleanup`
古いキャッシュデータの削除

**リクエストボディ:**
```json
{
  "older_than_days": 365,
  "dry_run": false
}
```

## エラーハンドリング

### エラーレスポンス形式
```json
{
  "error": {
    "code": "STOCK_PRICE_NOT_FOUND",
    "message": "指定した日付の株価データが見つかりません",
    "details": {
      "stock_id": "uuid",
      "date": "2024-01-15"
    }
  }
}
```

### 主要エラーコード
- `STOCK_PRICE_NOT_FOUND`: 株価データが見つからない
- `EXTERNAL_API_ERROR`: 外部API呼び出しエラー
- `INVALID_DATE_RANGE`: 無効な日付範囲
- `STOCK_NOT_FOUND`: 銘柄が見つからない
- `RATE_LIMIT_EXCEEDED`: API呼び出し制限超過

## 外部API連携

### 株価データプロバイダー

#### **推奨: メインAPI**
- **Yahoo Finance (非公式)**: `node-yahoo-finance2`ライブラリ使用（無料、TypeScript対応）

#### **フォールバックAPI（バックアップ用）**
- **Alpha Vantage**: 無料プラン（月500回、TypeScript対応）
- **Finnhub**: 無料プラン（月60回、TypeScript対応）

#### **有料API（将来的な拡張用）**
- **Polygon.io**: TypeScript対応、高品質データ（月$99〜）
- **IEX Cloud**: TypeScript対応、信頼性高（月$9〜）
- **Twelve Data**: TypeScript対応、豊富なデータ（月$29.99〜）

### 外部API呼び出し戦略
```typescript
class ExternalStockPriceAPI {
  async fetchStockPrice(symbol: string, date: string): Promise<StockPrice> {
    try {
      // 1. メインAPI（Yahoo Finance）
      const price = await this.fetchFromYahooFinance(symbol, date);
      return price;
    } catch (error) {
      // 2. フォールバック: Alpha Vantage
      return await this.fetchFromAlphaVantage(symbol, date);
    }
  }
  
  async fetchBatchPrices(symbol: string, startDate: string, endDate: string): Promise<StockPrice[]> {
    // Yahoo Finance はバッチ取得も可能
    return await this.fetchFromYahooFinance(symbol, startDate, endDate);
  }
}
```

### Yahoo Finance使用例（node-yahoo-finance2）
```typescript
import yahooFinance from 'yahoo-finance2';

class YahooFinanceAPI {
  async fetchStockPrice(symbol: string, date: string): Promise<StockPrice> {
    try {
      const quote = await yahooFinance.historical(symbol, {
        period1: date,
        period2: date,
        interval: '1d'
      });
      
      if (quote.length === 0) {
        throw new Error('No data found');
      }
      
      const data = quote[0];
      return {
        stock_price_id: generateUUID(),
        stock_id: await this.getStockId(symbol),
        price_date: date,
        open_price: data.open,
        close_price: data.close,
        high_price: data.high,
        low_price: data.low,
        volume: data.volume,
        last_updated: new Date().toISOString(),
        is_cached: false
      };
    } catch (error) {
      throw new Error(`Yahoo Finance API error: ${error.message}`);
    }
  }

  async fetchBatchPrices(symbol: string, startDate: string, endDate: string): Promise<StockPrice[]> {
    try {
      const quotes = await yahooFinance.historical(symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      });
      
      return quotes.map(data => ({
        stock_price_id: generateUUID(),
        stock_id: this.getStockId(symbol), // 同期処理または事前取得
        price_date: data.date.toISOString().split('T')[0],
        open_price: data.open,
        close_price: data.close,
        high_price: data.high,
        low_price: data.low,
        volume: data.volume,
        last_updated: new Date().toISOString(),
        is_cached: false
      }));
    } catch (error) {
      throw new Error(`Yahoo Finance batch API error: ${error.message}`);
    }
  }

  async getLatestPrice(symbol: string): Promise<StockPrice> {
    try {
      const quote = await yahooFinance.quote(symbol);
      
      return {
        stock_price_id: generateUUID(),
        stock_id: await this.getStockId(symbol),
        price_date: new Date().toISOString().split('T')[0],
        open_price: quote.regularMarketOpen,
        close_price: quote.regularMarketPrice,
        high_price: quote.regularMarketDayHigh,
        low_price: quote.regularMarketDayLow,
        volume: quote.regularMarketVolume,
        last_updated: new Date().toISOString(),
        is_cached: false,
        is_realtime: true
      };
    } catch (error) {
      throw new Error(`Yahoo Finance latest price error: ${error.message}`);
    }
  }
}
```

## パフォーマンス考慮事項

### キャッシュ戦略
- **TTL**: 1日（営業日終了後は更新不要）
- **バッチサイズ**: 最大100件/リクエスト
- **並列処理**: 最大5並列で外部API呼び出し

### データベース最適化
```sql
-- インデックス
CREATE INDEX idx_stock_price_stock_date ON StockPrice(stock_id, price_date);
CREATE INDEX idx_stock_price_date ON StockPrice(price_date);

-- パーティション（大量データ時）
CREATE TABLE StockPrice_2024 PARTITION OF StockPrice 
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

## 監視・メトリクス

### 重要指標
- **キャッシュヒット率**: 目標85%以上
- **API応答時間**: 平均500ms以下
- **外部API呼び出し回数**: 月間制限内
- **データ整合性**: 欠損データ0件

### アラート設定
- キャッシュヒット率 < 70%
- 外部API呼び出し失敗率 > 5%
- データベース応答時間 > 1秒

## 実装例

### サーバーサイド実装（TypeScript）
```typescript
import { PolygonAPI } from './apis/polygon';
import { AlphaVantageAPI } from './apis/alpha-vantage';
import { YahooFinanceAPI } from './apis/yahoo-finance';

export class StockPriceService {
  private polygonAPI: PolygonAPI;
  private alphaVantageAPI: AlphaVantageAPI;
  private yahooFinanceAPI: YahooFinanceAPI;

  constructor() {
    this.polygonAPI = new PolygonAPI(process.env.POLYGON_API_KEY);
    this.alphaVantageAPI = new AlphaVantageAPI(process.env.ALPHA_VANTAGE_API_KEY);
    this.yahooFinanceAPI = new YahooFinanceAPI();
  }

  async getStockPrice(stockId: string, date: string): Promise<StockPrice> {
    // 1. キャッシュから検索
    let price = await this.getFromCache(stockId, date);
    
    if (!price) {
      // 2. 外部APIから取得（フォールバック付き）
      price = await this.fetchWithFallback(stockId, date);
      
      // 3. キャッシュに保存
      await this.saveToCache(price);
    }
    
    return price;
  }

  private async fetchWithFallback(stockId: string, date: string): Promise<StockPrice> {
    const symbol = await this.getStockSymbol(stockId);
    
    try {
      // メインAPI（Yahoo Finance）
      return await this.yahooFinanceAPI.fetchStockPrice(symbol, date);
    } catch (error) {
      console.warn('Yahoo Finance failed, trying Alpha Vantage:', error);
      
      try {
        // フォールバック: Alpha Vantage
        return await this.alphaVantageAPI.getHistoricalPrice(symbol, date);
      } catch (error2) {
        console.warn('Alpha Vantage also failed:', error2);
        throw new Error('All external APIs failed');
      }
    }
  }
  
  async prefetchSimulationPrices(simulation: Simulation): Promise<void> {
    const { stock_id, start_date, end_date } = simulation;
    
    // 不足分を特定
    const missingDates = await this.findMissingDates(stock_id, start_date, end_date);
    
    if (missingDates.length === 0) return;
    
    // バッチ取得（効率的）
    const symbol = await this.getStockSymbol(stock_id);
    const prices = await this.yahooFinanceAPI.fetchBatchPrices(symbol, start_date, end_date);
    
    // 一括保存
    await this.saveBatchToCache(prices);
  }
}
```

### フロントエンド実装（React）
```typescript
export const useStockPrice = (stockId: string, date: string) => {
  return useQuery({
    queryKey: ['stockPrice', stockId, date],
    queryFn: () => api.getStockPrice(stockId, date),
    staleTime: 1000 * 60 * 60, // 1時間キャッシュ
    cacheTime: 1000 * 60 * 60 * 24, // 24時間保持
  });
};
```

## 今後の拡張予定

### Phase 2: 高度な機能
- リアルタイム価格更新（WebSocket）
- 株価アラート機能
- テクニカル指標計算
- バックテスト機能

### Phase 3: スケーリング
- 分散キャッシュ（Redis）
- 非同期処理キュー
- データベースシャーディング
- CDN活用
