# 銘柄検索機能の実装案

## 現在の設計の理解

現在の業務フローでは：
1. ユーザーがキーワードを入力
2. システムがAIリサーチ用プロンプトを生成
3. ユーザーが手動でAIに質問
4. AI回答を元に具体的なティッカーを特定
5. システムでシミュレーション開始

**「具体的なティッカーを得てからがシステムの範疇」**という設計は理にかなっています。

## システム側でできる改善案

### 1. **AIプロンプト生成の強化** ✅ 実装推奨

#### 現在の問題点
- 単純なプロンプト生成のみ
- ユーザーの意図を深く理解していない

#### 改善案
```typescript
// 強化されたプロンプト生成
class AIPromptGenerator {
  generateResearchPrompt(keywords: string, userContext?: UserContext): string {
    const basePrompt = `
以下の銘柄について投資判断のための詳細分析をお願いします：

検索キーワード: ${keywords}

分析観点:
1. 企業の基本情報と事業内容
2. 財務状況と成長性
3. 業界動向と競合状況
4. 投資リスク要因
5. 投資推奨度と理由

特に以下の点にご注意ください：
- 具体的なティッカーシンボル（例：AAPL, NVDA）を必ず明記
- 投資期間：6ヶ月〜1年を想定
- リスクとリターンの両面から分析
- データに基づいた客観的な評価
`;

    // ユーザーの過去の投資傾向を考慮
    if (userContext?.preferredSectors) {
      basePrompt += `\n\nユーザーの関心分野: ${userContext.preferredSectors.join(', ')}`;
    }

    return basePrompt;
  }
}
```

### 2. **銘柄候補の事前検証** ✅ 実装推奨

#### アイデア
AI回答からティッカーシンボルを抽出し、実際にデータが取得可能かチェック

```typescript
class StockValidator {
  async validateStockSymbols(aiResponse: string): Promise<ValidatedStock[]> {
    // AI回答からティッカーシンボルを抽出
    const symbols = this.extractSymbols(aiResponse);
    
    const validatedStocks = [];
    for (const symbol of symbols) {
      try {
        // 実際に株価データが取得できるかテスト
        const testPrice = await this.stockPriceApi.getLatestPrice(symbol);
        if (testPrice) {
          validatedStocks.push({
            symbol,
            name: testPrice.name,
            isAvailable: true,
            currentPrice: testPrice.close_price
          });
        }
      } catch (error) {
        // データが取得できない銘柄は除外
        console.warn(`Symbol ${symbol} is not available:`, error);
      }
    }
    
    return validatedStocks;
  }
}
```

### 3. **ユーザー体験の改善** ✅ 実装推奨

#### AI回答解析とティッカー抽出
```typescript
class AIResponseParser {
  parseAIResponse(response: string): ParsedResponse {
    return {
      recommendedStocks: this.extractRecommendedStocks(response),
      positiveFactors: this.extractPositiveFactors(response),
      riskFactors: this.extractRiskFactors(response),
      investmentThesis: this.extractInvestmentThesis(response),
      confidence: this.assessConfidence(response)
    };
  }

  private extractRecommendedStocks(response: string): StockRecommendation[] {
    // AI回答から銘柄とティッカーシンボルを抽出
    // 例: "NVDA (NVIDIA Corporation)" のような形式を解析
  }
}
```

### 4. **銘柄データベースの事前構築** ⚠️ 検討中

#### アイデア
主要な銘柄情報を事前にデータベースに保存

```sql
-- 主要銘柄の基本情報を事前保存
INSERT INTO stocks (stock_id, symbol, name, sector, industry) VALUES
('uuid-1', 'AAPL', 'Apple Inc.', 'Technology', 'Consumer Electronics'),
('uuid-2', 'NVDA', 'NVIDIA Corporation', 'Technology', 'Semiconductors'),
-- ... 主要銘柄を事前登録
```

#### メリット
- ティッカー検証が高速
- ユーザーに銘柄候補を提示可能

#### デメリット
- データの保守が大変
- 新しい銘柄への対応が遅い

### 5. **ハイブリッド検索** ⚠️ 将来的な拡張

#### アイデア
キーワードから直接銘柄を検索する機能も併用

```typescript
class HybridStockSearch {
  async search(keywords: string): Promise<SearchResult> {
    // 1. データベース内検索（高速）
    const dbResults = await this.searchInDatabase(keywords);
    
    // 2. AIプロンプト生成（現在の方法）
    const aiPrompt = await this.generateAIPrompt(keywords);
    
    return {
      databaseResults: dbResults,
      aiPrompt: aiPrompt,
      searchMethod: 'hybrid'
    };
  }
}
```

## 推奨実装順序

### Phase 1: 基本改善 ✅ すぐ実装
1. **AIプロンプト生成の強化**
   - より詳細で構造化されたプロンプト
   - ユーザーコンテキストの考慮

2. **AI回答解析機能**
   - ティッカーシンボルの自動抽出
   - 投資要因の構造化

3. **ティッカー検証機能**
   - 抽出されたシンボルの有効性確認
   - 実際の株価データ取得テスト

### Phase 2: ユーザー体験向上 ✅ 中期実装
1. **銘柄候補の自動提示**
   - AI回答から抽出した銘柄の一覧表示
   - 各銘柄の基本情報と現在価格

2. **投資要因の構造化表示**
   - ポジティブ要因・リスク要因の整理
   - 投資仮説の自動生成

### Phase 3: 高度な機能 ⚠️ 将来的な検討
1. **ハイブリッド検索**
2. **銘柄データベースの事前構築**
3. **AIとの直接連携**（API統合）

## 実装例

### 強化されたAIプロンプト生成
```typescript
// app/services/aiPromptService.ts
export class AIPromptService {
  generateEnhancedPrompt(keywords: string, userPreferences?: UserPreferences): string {
    const context = this.buildContext(userPreferences);
    
    return `
投資分析をお願いします。

【検索条件】
キーワード: ${keywords}

【分析要件】
1. 具体的なティッカーシンボル（例：AAPL, NVDA）を必ず明記
2. 企業の基本情報（事業内容、市場シェア）
3. 財務分析（収益性、成長性、安全性）
4. 業界分析（成長性、競合状況、規制環境）
5. 投資要因（ポジティブ要因とリスク要因）
6. 投資推奨度（1-5段階評価と理由）

【出力形式】
- 銘柄: [ティッカーシンボル] ([会社名])
- 業界: [セクター/業界]
- 投資推奨度: [1-5]/5
- ポジティブ要因: 
  - [要因1]
  - [要因2]
- リスク要因:
  - [リスク1]
  - [リスク2]
- 投資仮説: [6ヶ月〜1年の投資戦略]

${context}
`;
  }
}
```

### AI回答解析
```typescript
// app/services/aiResponseParser.ts
export class AIResponseParser {
  parseResponse(response: string): ParsedAIResponse {
    return {
      stocks: this.extractStocks(response),
      positiveFactors: this.extractPositiveFactors(response),
      riskFactors: this.extractRiskFactors(response),
      investmentThesis: this.extractInvestmentThesis(response),
      confidence: this.calculateConfidence(response)
    };
  }

  private extractStocks(response: string): StockRecommendation[] {
    // 正規表現でティッカーシンボルを抽出
    const stockPattern = /([A-Z]{1,5})\s*\(([^)]+)\)/g;
    const stocks: StockRecommendation[] = [];
    
    let match;
    while ((match = stockPattern.exec(response)) !== null) {
      stocks.push({
        symbol: match[1],
        name: match[2],
        extractedFrom: response.substring(Math.max(0, match.index - 100), match.index + 100)
      });
    }
    
    return stocks;
  }
}
```

## 結論

現在の「具体的なティッカーを得てからがシステムの範疇」という設計は適切ですが、以下の改善でユーザー体験を大幅に向上できます：

1. **AIプロンプト生成の強化** - より構造化された分析依頼
2. **AI回答解析** - ティッカーシンボルの自動抽出
3. **ティッカー検証** - データ取得可能性の事前確認

これにより、ユーザーはAI回答から銘柄を手動で探す手間が減り、システムがより使いやすくなります。
