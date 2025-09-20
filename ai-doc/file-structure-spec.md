# ファイル構成仕様書

## 参考アプリの分析

### 優れた構成パターン
- **components/**: 再利用可能なUIコンポーネント
- **hooks/**: カスタムフック（状態管理・ロジック）
- **models/**: データモデル定義
- **routes/**: ページルート（Remixの特徴）
- **services/**: API呼び出し・外部連携
- **types/**: TypeScript型定義
- **utils/**: ユーティリティ関数

## 投資シミュレーションアプリのファイル構成

```
app/
├── app.css                          # グローバルスタイル
├── components/                      # UIコンポーネント
│   ├── ui/                         # 基本UIコンポーネント
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── DarkModeToggle.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ConfirmDialog.tsx
│   ├── charts/                     # チャート関連
│   │   ├── StockPriceChart.tsx
│   │   ├── PerformanceChart.tsx
│   │   ├── PortfolioChart.tsx
│   │   └── ComparisonChart.tsx
│   ├── simulation/                 # シミュレーション関連
│   │   ├── SimulationCard.tsx
│   │   ├── SimulationForm.tsx
│   │   ├── SimulationHeader.tsx
│   │   ├── SimulationStatus.tsx
│   │   ├── CheckpointList.tsx
│   │   ├── CheckpointForm.tsx
│   │   └── ReviewForm.tsx
│   ├── stock/                      # 株価・銘柄関連
│   │   ├── StockSearchForm.tsx
│   │   ├── StockCard.tsx
│   │   ├── StockPriceDisplay.tsx
│   │   ├── StockInfoModal.tsx
│   │   ├── AIPromptGenerator.tsx
│   │   └── AIAnalysisForm.tsx
│   ├── portfolio/                  # ポートフォリオ関連
│   │   ├── PortfolioSummary.tsx
│   │   ├── PnLDisplay.tsx
│   │   ├── PositionTable.tsx
│   │   └── PerformanceMetrics.tsx
│   └── dashboard/                  # ダッシュボード関連
│       ├── DashboardStats.tsx
│       ├── ActiveSimulations.tsx
│       ├── CompletedSimulations.tsx
│       └── LearningInsights.tsx
├── entry.server.tsx                # サーバーエントリーポイント
├── hooks/                          # カスタムフック
│   ├── useStockPrice.ts           # 株価データ取得
│   ├── useSimulation.ts           # シミュレーション管理
│   ├── useCheckpoint.ts           # チェックポイント管理
│   ├── usePortfolio.ts            # ポートフォリオ計算
│   ├── useDarkMode.ts             # ダークモード
│   ├── useToast.ts                # トースト通知
│   └── useLocalStorage.ts         # ローカルストレージ
├── models/                         # データモデル
│   ├── stock.ts                   # 株価・銘柄モデル
│   ├── simulation.ts              # シミュレーションモデル
│   ├── checkpoint.ts              # チェックポイントモデル
│   ├── portfolio.ts               # ポートフォリオモデル
│   └── user.ts                    # ユーザーモデル
├── root.tsx                       # ルートコンポーネント
├── routes/                        # ページルート
│   ├── api/                       # APIエンドポイント
│   │   ├── stocks.ts             # 株価API
│   │   ├── simulations.ts        # シミュレーションAPI
│   │   ├── checkpoints.ts        # チェックポイントAPI
│   │   ├── portfolio.ts          # ポートフォリオAPI
│   │   └── ai-research.ts        # AIリサーチAPI
│   ├── dashboard.tsx             # ダッシュボード
│   ├── stocks.tsx                # 銘柄検索
│   ├── simulation.tsx            # シミュレーション詳細
│   ├── simulation.new.tsx        # 新規シミュレーション
│   ├── checkpoint.tsx            # チェックポイント作成
│   ├── review.tsx                # レビュー・学習
│   ├── portfolio.tsx             # ポートフォリオ一覧
│   └── learnings.tsx             # 学習データベース
├── routes.ts                      # ルート設定
├── services/                      # 外部サービス連携
│   ├── stockPriceApi.ts          # 株価API（Yahoo Finance等）
│   ├── simulationApi.ts          # シミュレーションAPI
│   ├── checkpointApi.ts          # チェックポイントAPI
│   ├── portfolioApi.ts           # ポートフォリオAPI
│   ├── aiResearchApi.ts          # AIリサーチAPI
│   └── notificationApi.ts        # 通知API
├── types/                         # TypeScript型定義
│   ├── stock.ts                  # 株価・銘柄型
│   ├── simulation.ts             # シミュレーション型
│   ├── checkpoint.ts             # チェックポイント型
│   ├── portfolio.ts              # ポートフォリオ型
│   ├── api.ts                    # API型
│   └── common.ts                 # 共通型
├── utils/                         # ユーティリティ関数
│   ├── stock.ts                  # 株価計算
│   ├── simulation.ts             # シミュレーション計算
│   ├── portfolio.ts              # ポートフォリオ計算
│   ├── date.ts                   # 日付処理
│   ├── format.ts                 # フォーマット
│   ├── validation.ts             # バリデーション
│   └── constants.ts              # 定数定義
└── welcome/                       # ウェルカムページ
    ├── logo-dark.svg
    ├── logo-light.svg
    └── welcome.tsx
```

## 主要ディレクトリの詳細

### components/ - UIコンポーネント
```
components/
├── ui/                    # 基本UI（再利用可能）
├── charts/                # チャート専用コンポーネント
├── simulation/            # シミュレーション関連UI
├── stock/                 # 株価・銘柄関連UI
├── portfolio/             # ポートフォリオ関連UI
└── dashboard/             # ダッシュボード関連UI
```

**特徴:**
- 機能別にディレクトリを分割
- 再利用可能な基本UIコンポーネントを分離
- チャート専用コンポーネントを独立

### hooks/ - カスタムフック
```typescript
// useStockPrice.ts の例
export const useStockPrice = (symbol: string, date?: string) => {
  return useQuery({
    queryKey: ['stockPrice', symbol, date],
    queryFn: () => stockPriceApi.getStockPrice(symbol, date),
    staleTime: 1000 * 60 * 5, // 5分キャッシュ
  });
};

// useSimulation.ts の例
export const useSimulation = (simulationId: string) => {
  return useQuery({
    queryKey: ['simulation', simulationId],
    queryFn: () => simulationApi.getSimulation(simulationId),
  });
};
```

### models/ - データモデル
```typescript
// models/simulation.ts の例
export interface Simulation {
  simulation_id: string;
  stock_id: string;
  initial_capital: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Checkpoint {
  checkpoint_id: string;
  simulation_id: string;
  checkpoint_date: string;
  checkpoint_type: 'manual' | 'auto_buy' | 'auto_sell';
  note: string;
  created_at: string;
}
```

### services/ - 外部API連携
```typescript
// services/stockPriceApi.ts の例
export class StockPriceApi {
  async getStockPrice(symbol: string, date: string): Promise<StockPrice> {
    // Yahoo Finance API呼び出し
  }
  
  async getBatchPrices(symbol: string, startDate: string, endDate: string): Promise<StockPrice[]> {
    // バッチ取得
  }
  
  async getLatestPrice(symbol: string): Promise<StockPrice> {
    // 最新価格取得
  }
}
```

### utils/ - ユーティリティ関数
```typescript
// utils/portfolio.ts の例
export const calculatePnL = (positions: Position[], currentPrice: number) => {
  // 損益計算ロジック
};

export const calculatePortfolioValue = (positions: Position[], prices: StockPrice[]) => {
  // ポートフォリオ価値計算
};

// utils/date.ts の例
export const formatDate = (date: string): string => {
  // 日付フォーマット
};

export const getBusinessDays = (startDate: string, endDate: string): number => {
  // 営業日数計算
};
```

## 実装の優先順位

### Phase 1: 基本構成
1. **基本UIコンポーネント** (`components/ui/`)
2. **型定義** (`types/`)
3. **ユーティリティ** (`utils/`)
4. **ダッシュボード** (`routes/dashboard.tsx`)

### Phase 2: 株価・シミュレーション機能
1. **株価API** (`services/stockPriceApi.ts`)
2. **シミュレーション機能** (`routes/simulation.tsx`)
3. **チャートコンポーネント** (`components/charts/`)

### Phase 3: 高度な機能
1. **チェックポイント機能**
2. **ポートフォリオ管理**
3. **学習・レビュー機能**

## 命名規則

### ファイル名
- **コンポーネント**: PascalCase (`StockCard.tsx`)
- **フック**: camelCase (`useStockPrice.ts`)
- **ユーティリティ**: camelCase (`calculatePnL.ts`)
- **型定義**: camelCase (`stock.ts`)

### ディレクトリ名
- **kebab-case**: 複数単語の場合 (`stock-price/`)
- **camelCase**: 単語の場合 (`charts/`)

## インポート規則

```typescript
// 相対インポート（同一ディレクトリ内）
import { Button } from './Button';

// 絶対インポート（異なるディレクトリ）
import { useStockPrice } from '~/hooks/useStockPrice';
import { StockCard } from '~/components/stock/StockCard';
import { calculatePnL } from '~/utils/portfolio';
```

この構成により、保守性・拡張性・再利用性の高いアプリケーションが構築できます。
