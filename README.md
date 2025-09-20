# 投資シミュレーションアプリケーション

AIを活用した株式投資戦略の仮説検証と学習支援システム。

## プロジェクト概要

- **目的**: 投資戦略の仮説検証と学習支援
- **技術スタック**: React (Remix) + Cloudflare Workers + D1
- **特徴**: AIリサーチ連携、チェックポイント方式、自動監視

## セットアップ

### 1. プロジェクト初期化
```bash
npm create cloudflare@latest -- simulator-app --framework=react-router
```

### 2. Git設定
```bash
git init
git remote add origin git@github.com:IkuyaYamada/simulator-app.git
```

### 3. データベース設定

#### D1データベース作成
```bash
npx wrangler d1 create simulator-app-db
```

#### データベース初期化
```bash
# ローカル開発（デフォルト）
npx wrangler d1 execute simulator-app-db --file=./database/init.sql

# 本番環境
npx wrangler d1 execute simulator-app-db --remote --file=./database/init.sql
```

#### データベース設定情報
- **データベース名**: `simulator-app-db`
- **バインディング名**: `simulator_app_db`
- **データベースID**: `209c7ccc-d9f9-4d56-92fa-1a16e3d18372`

## 開発

### ローカル開発サーバー起動
```bash
npm run dev
```

### データベース操作
```bash
# ローカルデータベースにクエリ実行
npx wrangler d1 execute simulator-app-db --command="SELECT * FROM stocks"

# 本番データベースにクエリ実行
npx wrangler d1 execute simulator-app-db --remote --command="SELECT * FROM stocks"
```

### デプロイ
```bash
npm run deploy

npx wrangler d1 execute simulator-app-db --remote --file=./database/init.sql
```

## プロジェクト構成

```
├── ai-doc/                    # 設計ドキュメント
├── app/                       # アプリケーションコード
├── database/                  # データベーススキーマ
├── workers/                   # Cloudflare Workers
└── wrangler.jsonc            # Wrangler設定
```

## 主要機能

1. **銘柄検索・AIリサーチ**: キーワード検索とAI分析支援
2. **投資シミュレーション**: 仮説設定と戦略実行
3. **チェックポイント管理**: 定期的な投資判断記録
4. **ポートフォリオ追跡**: 損益・パフォーマンス分析
5. **学習・レビュー**: 投資スキル向上支援

## データベーススキーマ

- `stocks`: 株式銘柄情報
- `stock_prices`: 株価データ（キャッシュ機能付き）
- `simulations`: 投資シミュレーション
- `checkpoints`: チェックポイント
- `hypotheses`: 投資仮説
- `conditions`: 売買条件
- `pnl_records`: 損益記録
- `journals`: 投資日記
- `reviews`: レビュー・学習

## 設計ドキュメント

詳細は `ai-doc/` ディレクトリの設計ドキュメントを参照してください：

- [システム概要](ai-doc/system-overview.md) - プロジェクト全体の概要
- [エンティティ関係図](ai-doc/entity-relationship-model.md) - データベース設計
- [業務フロー](ai-doc/gyomu-flow.md) - 投資シミュレーションの流れ
- [UI設計](ai-doc/ui-design-spec.md) - ユーザーインターフェース設計
- [株価API仕様](ai-doc/stock-price-api-spec.md) - 株価データ取得API
- [AIプロンプト設計](ai-doc/ai-prompt-design.md) - AI連携とプロンプト戦略
- [ファイル構成](ai-doc/file-structure-spec.md) - プロジェクト構造
