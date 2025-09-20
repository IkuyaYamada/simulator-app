# AIプロンプト設計仕様書

## 基本方針

**AIプロンプトで出力形式を制御し、システムメッセージでユーザーに期待形式を明示**

## プロンプト設計

### 1. 基本プロンプト構造

```typescript
const generateAIPrompt = (keywords: string): string => {
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

**銘柄2:**
- ティッカー: [例: NVDA]
- 会社名: [例: NVIDIA Corporation]
- 業界: [例: テクノロジー/セミコンダクター]
- 投資推奨度: [1-5]/5

### 2. 投資分析

**銘柄1の分析:**
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

**銘柄2の分析:**
[同様の形式で記載]

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
```

### 2. システムメッセージテンプレート

```typescript
const generateSystemMessage = (): string => {
  return `
🤖 **AI分析の使用方法**

1. **上記のプロンプトをコピー**して、ChatGPTやClaudeなどのAIサービスに貼り付けてください

2. **AI回答の形式**を確認してください：
   - ✅ ティッカーシンボル（例：AAPL, NVDA）
   - ✅ 投資推奨度（1-5段階）
   - ✅ ポジティブ要因・リスク要因
   - ✅ 投資仮説

3. **AI回答を下のテキストエリアに貼り付け**してください

4. システムが自動的に：
   - ティッカーシンボルを抽出
   - 投資要因を整理
   - シミュレーション作成に必要な情報を準備

**💡 ヒント:** AI回答が指定の形式になっていない場合は、AIに「指定の形式で回答してください」と追加で依頼してください。
`;
};
```

## UI設計の更新

### 銘柄検索・AIリサーチ画面（更新版）

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 銘柄検索とAIリサーチ                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 検索キーワード: [AI関連企業の成長株          ] [検索]    │
│                                                         │
│ 🤖 AI分析の使用方法                                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 1. 下記のプロンプトをコピーしてAIサービスに貼り付け │ │
│ │ 2. AI回答を指定形式で取得                           │ │
│ │ 3. 回答を下のテキストエリアに貼り付け               │ │
│ │ 4. システムが自動解析してシミュレーション準備       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 📋 生成されたAIプロンプト                               │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 投資分析をお願いします。                            │ │
│ │                                                     │ │
│ │ 【検索条件】                                        │ │
│ │ キーワード: AI関連企業の成長株                      │ │
│ │                                                     │ │
│ │ 【出力形式（必ずこの形式で回答してください）】       │ │
│ │                                                     │ │
│ │ ## 分析結果                                         │ │
│ │                                                     │ │
│ │ ### 1. 推奨銘柄                                     │ │
│ │ **銘柄1:**                                          │ │
│ │ - ティッカー: [例: AAPL]                           │ │
│ │ - 会社名: [例: Apple Inc.]                         │ │
│ │ - 業界: [例: テクノロジー]                         │ │
│ │ - 投資推奨度: [1-5]/5                              │ │
│ │                                                     │ │
│ │ ### 2. 投資分析                                     │ │
│ │ **銘柄1の分析:**                                    │ │
│ │ **ポジティブ要因:**                                 │ │
│ │ - [要因1]                                          │ │
│ │ - [要因2]                                          │ │
│ │                                                     │ │
│ │ **リスク要因:**                                     │ │
│ │ - [リスク1]                                        │ │
│ │ - [リスク2]                                        │ │
│ │                                                     │ │
│ │ **投資仮説:**                                       │ │
│ │ [6ヶ月〜1年の投資戦略]                             │ │
│ │                                                     │ │
│ │ ### 3. 総合評価                                     │ │
│ │ **最も推奨する銘柄:** [ティッカー]                  │ │
│ │ **理由:** [理由]                                   │ │
│ │                                                     │ │
│ │ [プロンプトをコピー]                                │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 📝 AI分析結果入力                                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ AIからの分析結果を貼り付けてください:               │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ ## 分析結果                                     │ │ │
│ │ │                                                 │ │ │
│ │ │ ### 1. 推奨銘柄                                 │ │ │
│ │ │ **銘柄1:**                                      │ │ │
│ │ │ - ティッカー: NVDA                              │ │ │
│ │ │ - 会社名: NVIDIA Corporation                    │ │ │
│ │ │ - 業界: テクノロジー/セミコンダクター           │ │ │
│ │ │ - 投資推奨度: 4/5                              │ │ │
│ │ │                                                 │ │ │
│ │ │ **銘柄2:**                                      │ │ │
│ │ │ - ティッカー: AAPL                              │ │ │
│ │ │ - 会社名: Apple Inc.                           │ │ │
│ │ │ - 業界: テクノロジー/コンシューマーエレクトロニクス │ │ │
│ │ │ - 投資推奨度: 3/5                              │ │ │
│ │ │                                                 │ │ │
│ │ │ ### 2. 投資分析                                 │ │ │
│ │ │ **NVDAの分析:**                                 │ │ │
│ │ │ **ポジティブ要因:**                             │ │ │
│ │ │ - AI需要の急激な増加                           │ │ │
│ │ │ - データセンター事業の成長                       │ │ │
│ │ │ - 新製品の投入予定                              │ │ │
│ │ │                                                 │ │ │
│ │ │ **リスク要因:**                                 │ │ │
│ │ │ - 競合他社の参入                                │ │ │
│ │ │ - 地政学的リスク                                │ │ │
│ │ │                                                 │ │ │
│ │ │ **投資仮説:**                                   │ │ │
│ │ │ AI需要の継続的増加により6ヶ月〜1年で20-30%の    │ │ │
│ │ │ 株価上昇が期待される                            │ │ │
│ │ │                                                 │ │ │
│ │ │ ### 3. 総合評価                                 │ │ │
│ │ │ **最も推奨する銘柄:** NVDA                      │ │ │
│ │ │ **理由:** AI需要の成長性が最も高い              │ │ │
│ │ │ **推奨投資期間:** 6ヶ月〜1年                   │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ [AI回答を解析] [シミュレーション作成に進む]         │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 自動解析機能

### AI回答解析ロジック

```typescript
class AIResponseParser {
  parseAIResponse(response: string): ParsedAIResponse {
    return {
      stocks: this.extractStocks(response),
      positiveFactors: this.extractPositiveFactors(response),
      riskFactors: this.extractRiskFactors(response),
      investmentThesis: this.extractInvestmentThesis(response),
      overallRecommendation: this.extractOverallRecommendation(response)
    };
  }

  private extractStocks(response: string): StockRecommendation[] {
    const stocks: StockRecommendation[] = [];
    
    // ティッカーシンボルの抽出（大文字の英字2-5文字）
    const tickerPattern = /ティッカー:\s*([A-Z]{2,5})/g;
    let match;
    
    while ((match = tickerPattern.exec(response)) !== null) {
      const ticker = match[1];
      
      // 会社名の抽出
      const companyNameMatch = response.match(
        new RegExp(`ティッカー:\\s*${ticker}[\\s\\S]*?会社名:\\s*([^\\n]+)`, 'i')
      );
      
      // 投資推奨度の抽出
      const ratingMatch = response.match(
        new RegExp(`ティッカー:\\s*${ticker}[\\s\\S]*?投資推奨度:\\s*(\\d)/5`, 'i')
      );
      
      stocks.push({
        symbol: ticker,
        name: companyNameMatch?.[1]?.trim() || '',
        rating: parseInt(ratingMatch?.[1] || '0'),
        extractedFrom: this.findContext(response, ticker)
      });
    }
    
    return stocks;
  }

  private extractPositiveFactors(response: string): string[] {
    const factors: string[] = [];
    const positiveSection = response.match(/ポジティブ要因:([\s\S]*?)(?=リスク要因:|$)/i);
    
    if (positiveSection) {
      const lines = positiveSection[1].split('\n');
      lines.forEach(line => {
        const factor = line.replace(/^[\s-*•]\s*/, '').trim();
        if (factor && factor.length > 3) {
          factors.push(factor);
        }
      });
    }
    
    return factors;
  }

  private extractRiskFactors(response: string): string[] {
    const factors: string[] = [];
    const riskSection = response.match(/リスク要因:([\s\S]*?)(?=投資仮説:|総合評価:|$)/i);
    
    if (riskSection) {
      const lines = riskSection[1].split('\n');
      lines.forEach(line => {
        const factor = line.replace(/^[\s-*•]\s*/, '').trim();
        if (factor && factor.length > 3) {
          factors.push(factor);
        }
      });
    }
    
    return factors;
  }

  private extractInvestmentThesis(response: string): string {
    const thesisMatch = response.match(/投資仮説:([\s\S]*?)(?=総合評価:|$)/i);
    return thesisMatch?.[1]?.trim() || '';
  }

  private extractOverallRecommendation(response: string): OverallRecommendation {
    const recommendationMatch = response.match(/最も推奨する銘柄:\s*([A-Z]{2,5})/i);
    const reasonMatch = response.match(/理由:\s*([^\n]+)/i);
    const periodMatch = response.match(/推奨投資期間:\s*([^\n]+)/i);
    
    return {
      symbol: recommendationMatch?.[1] || '',
      reason: reasonMatch?.[1]?.trim() || '',
      period: periodMatch?.[1]?.trim() || ''
    };
  }
}
```

## 実装のメリット

### 1. **AI出力の制御**
- 構造化された回答を強制
- 必要な情報の確実な取得
- パースエラーの削減

### 2. **ユーザー体験の向上**
- 明確な手順の提示
- 期待される形式の明示
- 自動解析による手作業削減

### 3. **システムの信頼性**
- 一貫したデータ形式
- エラーハンドリングの簡素化
- デバッグの容易さ

## 実装優先順位

### Phase 1: 基本実装
1. 構造化されたAIプロンプト生成
2. システムメッセージの表示
3. 基本的なAI回答解析

### Phase 2: 高度な解析
1. より詳細なデータ抽出
2. エラーハンドリングの強化
3. ユーザーフィードバック機能

この設計により、AIの出力を制御しながら、ユーザーに明確な手順を提示できます！
