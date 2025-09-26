-- 投資シミュレーションアプリケーション データベース初期化スクリプト
-- Cloudflare D1 (SQLite) 用
-- ============================================================================
-- テーブル削除（開発・テスト用）
-- ============================================================================
-- 外部キー制約を無効化
PRAGMA foreign_keys = OFF;

-- テーブル削除（依存関係の逆順）
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS journals;
DROP TABLE IF EXISTS pnl_records;
DROP TABLE IF EXISTS conditions;
DROP TABLE IF EXISTS hypotheses;
DROP TABLE IF EXISTS checkpoints;
DROP TABLE IF EXISTS simulations;
DROP TABLE IF EXISTS stock_prices;
DROP TABLE IF EXISTS stocks;

-- ビュー削除
DROP VIEW IF EXISTS simulation_details;
DROP VIEW IF EXISTS latest_stock_prices;
DROP VIEW IF EXISTS active_checkpoints;

-- トリガー削除
DROP TRIGGER IF EXISTS update_stocks_updated_at;
DROP TRIGGER IF EXISTS update_simulations_updated_at;
DROP TRIGGER IF EXISTS update_hypotheses_updated_at;
DROP TRIGGER IF EXISTS update_conditions_updated_at;

-- 外部キー制約を再有効化
PRAGMA foreign_keys = ON;

-- ============================================================================
-- テーブル作成
-- ============================================================================
-- 株式銘柄テーブル
CREATE TABLE
    IF NOT EXISTS stocks (
        symbol TEXT PRIMARY KEY, -- 銘柄コード (例: AAPL, NVDA) - PKに昇格
        name TEXT NOT NULL, -- 会社名
        sector TEXT, -- セクター
        industry TEXT, -- 業界
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

-- 株価データテーブル
CREATE TABLE
    IF NOT EXISTS stock_prices (
        stock_price_id TEXT PRIMARY KEY, -- UUID
        symbol TEXT NOT NULL, -- 銘柄コード (FK to stocks.symbol)
        price_date DATE NOT NULL, -- 価格日付
        open_price DECIMAL(10, 2) NOT NULL, -- 始値
        close_price DECIMAL(10, 2) NOT NULL, -- 終値
        high_price DECIMAL(10, 2) NOT NULL, -- 高値
        low_price DECIMAL(10, 2) NOT NULL, -- 安値
        volume BIGINT, -- 出来高
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_cached BOOLEAN DEFAULT TRUE, -- キャッシュフラグ
        FOREIGN KEY (symbol) REFERENCES stocks (symbol),
        UNIQUE (symbol, price_date)
    );

-- シミュレーションテーブル
CREATE TABLE
    IF NOT EXISTS simulations (
        simulation_id TEXT PRIMARY KEY, -- UUID
        symbol TEXT NOT NULL, -- 銘柄コード (FK to stocks.symbol)
        initial_capital INTEGER NOT NULL, -- 初期資本
        start_date DATE NOT NULL, -- 開始日
        end_date DATE NOT NULL, -- 終了日
        status TEXT DEFAULT 'active', -- ステータス (active, completed, paused)
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (symbol) REFERENCES stocks (symbol)
    );

-- チェックポイントテーブル
CREATE TABLE
    IF NOT EXISTS checkpoints (
        checkpoint_id TEXT PRIMARY KEY, -- UUID
        simulation_id TEXT NOT NULL, -- シミュレーションID (FK)
        checkpoint_date DATE NOT NULL, -- チェックポイント日付
        checkpoint_type TEXT NOT NULL, -- タイプ (manual, auto_buy, auto_sell)
        note TEXT, -- メモ
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (simulation_id) REFERENCES simulations (simulation_id)
    );

-- 投資仮説テーブル
CREATE TABLE
    IF NOT EXISTS hypotheses (
        hypothesis_id TEXT PRIMARY KEY, -- UUID
        checkpoint_id TEXT NOT NULL, -- チェックポイントID (FK)
        description TEXT NOT NULL, -- 仮説の説明
        is_active BOOLEAN DEFAULT TRUE, -- アクティブフラグ
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (checkpoint_id) REFERENCES checkpoints (checkpoint_id)
    );

-- 売買条件テーブル
CREATE TABLE
    IF NOT EXISTS conditions (
        condition_id TEXT PRIMARY KEY, -- UUID
        checkpoint_id TEXT NOT NULL, -- チェックポイントID (FK)
        type TEXT NOT NULL, -- タイプ (buy, sell, profit_take, stop_loss)
        metric TEXT NOT NULL, -- 指標 (price, percentage, rsi, etc.)
        value TEXT NOT NULL, -- 値
        is_active BOOLEAN DEFAULT TRUE, -- アクティブフラグ
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (checkpoint_id) REFERENCES checkpoints (checkpoint_id)
    );

-- 損益記録テーブル
CREATE TABLE
    IF NOT EXISTS pnl_records (
        pnl_id TEXT PRIMARY KEY, -- UUID
        checkpoint_id TEXT NOT NULL, -- チェックポイントID (FK)
        stock_price_id TEXT NOT NULL, -- 株価ID (FK)
        position_size DECIMAL(10, 4) NOT NULL, -- ポジションサイズ
        realized_pl DECIMAL(10, 2) DEFAULT 0, -- 実現損益
        unrealized_pl DECIMAL(10, 2) DEFAULT 0, -- 未実現損益
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (checkpoint_id) REFERENCES checkpoints (checkpoint_id),
        FOREIGN KEY (stock_price_id) REFERENCES stock_prices (stock_price_id)
    );

-- 投資日記テーブル
CREATE TABLE
    IF NOT EXISTS journals (
        journal_id TEXT PRIMARY KEY, -- UUID
        simulation_id TEXT NOT NULL, -- シミュレーションID (FK)
        checkpoint_id TEXT, -- チェックポイントID (FK, nullable)
        title TEXT NOT NULL, -- タイトル
        content TEXT NOT NULL, -- 内容
        journal_date DATE NOT NULL, -- 日記日付
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (simulation_id) REFERENCES simulations (simulation_id),
        FOREIGN KEY (checkpoint_id) REFERENCES checkpoints (checkpoint_id)
    );

-- レビューテーブル
CREATE TABLE
    IF NOT EXISTS reviews (
        review_id TEXT PRIMARY KEY, -- UUID
        simulation_id TEXT NOT NULL, -- シミュレーションID (FK)
        outcome_memo TEXT, -- 結果メモ
        is_hypothesis_correct BOOLEAN, -- 仮説が正しかったか
        learning TEXT, -- 学習内容
        final_profit_loss DECIMAL(10, 2), -- 最終損益
        reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (simulation_id) REFERENCES simulations (simulation_id),
        UNIQUE (simulation_id)
    );

-- ============================================================================
-- インデックス作成
-- ============================================================================
-- 株価データのインデックス
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol_date ON stock_prices (symbol, price_date);

CREATE INDEX IF NOT EXISTS idx_stock_prices_date ON stock_prices (price_date);

-- シミュレーションのインデックス
CREATE INDEX IF NOT EXISTS idx_simulations_symbol ON simulations (symbol);

CREATE INDEX IF NOT EXISTS idx_simulations_status ON simulations (status);

CREATE INDEX IF NOT EXISTS idx_simulations_dates ON simulations (start_date, end_date);

-- チェックポイントのインデックス
CREATE INDEX IF NOT EXISTS idx_checkpoints_simulation ON checkpoints (simulation_id);

CREATE INDEX IF NOT EXISTS idx_checkpoints_date ON checkpoints (checkpoint_date);

CREATE INDEX IF NOT EXISTS idx_checkpoints_type ON checkpoints (checkpoint_type);

-- 仮説のインデックス
CREATE INDEX IF NOT EXISTS idx_hypotheses_checkpoint ON hypotheses (checkpoint_id);

CREATE INDEX IF NOT EXISTS idx_hypotheses_active ON hypotheses (is_active);

-- 条件のインデックス
CREATE INDEX IF NOT EXISTS idx_conditions_checkpoint ON conditions (checkpoint_id);

CREATE INDEX IF NOT EXISTS idx_conditions_type ON conditions (type);

CREATE INDEX IF NOT EXISTS idx_conditions_active ON conditions (is_active);

-- 損益記録のインデックス
CREATE INDEX IF NOT EXISTS idx_pnl_records_checkpoint ON pnl_records (checkpoint_id);

CREATE INDEX IF NOT EXISTS idx_pnl_records_price ON pnl_records (stock_price_id);

CREATE INDEX IF NOT EXISTS idx_pnl_records_date ON pnl_records (recorded_at);

-- 投資日記のインデックス
CREATE INDEX IF NOT EXISTS idx_journals_simulation ON journals (simulation_id);

CREATE INDEX IF NOT EXISTS idx_journals_checkpoint ON journals (checkpoint_id);

CREATE INDEX IF NOT EXISTS idx_journals_date ON journals (journal_date);


-- ============================================================================
-- ビュー作成（便利なクエリ用）
-- ============================================================================
-- シミュレーション詳細ビュー
CREATE VIEW
    IF NOT EXISTS simulation_details AS
SELECT
    s.simulation_id,
    s.symbol,
    s.initial_capital,
    s.start_date,
    s.end_date,
    s.status,
    st.name as stock_name,
    st.sector,
    st.industry,
    s.created_at
FROM
    simulations s
    JOIN stocks st ON s.symbol = st.symbol;

-- 最新株価ビュー
CREATE VIEW
    IF NOT EXISTS latest_stock_prices AS
SELECT
    sp.symbol,
    st.name,
    sp.price_date,
    sp.close_price,
    sp.volume,
    sp.last_updated
FROM
    stock_prices sp
    JOIN stocks st ON sp.symbol = st.symbol
WHERE
    sp.price_date = (
        SELECT
            MAX(price_date)
        FROM
            stock_prices sp2
        WHERE
            sp2.symbol = sp.symbol
    );

-- アクティブなチェックポイントビュー
CREATE VIEW
    IF NOT EXISTS active_checkpoints AS
SELECT
    c.checkpoint_id,
    c.simulation_id,
    c.checkpoint_date,
    c.checkpoint_type,
    c.note,
    s.symbol,
    st.name as stock_name
FROM
    checkpoints c
    JOIN simulations s ON c.simulation_id = s.simulation_id
    JOIN stocks st ON s.symbol = st.symbol
WHERE
    s.status = 'active'
ORDER BY
    c.checkpoint_date DESC;

-- ============================================================================
-- トリガー作成（自動更新用）
-- ============================================================================
-- stocks テーブルの updated_at 自動更新
CREATE TRIGGER IF NOT EXISTS update_stocks_updated_at AFTER
UPDATE ON stocks BEGIN
UPDATE stocks
SET
    updated_at = CURRENT_TIMESTAMP
WHERE
    symbol = NEW.symbol;

END;

-- simulations テーブルの updated_at 自動更新
CREATE TRIGGER IF NOT EXISTS update_simulations_updated_at AFTER
UPDATE ON simulations BEGIN
UPDATE simulations
SET
    updated_at = CURRENT_TIMESTAMP
WHERE
    simulation_id = NEW.simulation_id;

END;

-- hypotheses テーブルの updated_at 自動更新
CREATE TRIGGER IF NOT EXISTS update_hypotheses_updated_at AFTER
UPDATE ON hypotheses BEGIN
UPDATE hypotheses
SET
    updated_at = CURRENT_TIMESTAMP
WHERE
    hypothesis_id = NEW.hypothesis_id;

END;

-- conditions テーブルの updated_at 自動更新
CREATE TRIGGER IF NOT EXISTS update_conditions_updated_at AFTER
UPDATE ON conditions BEGIN
UPDATE conditions
SET
    updated_at = CURRENT_TIMESTAMP
WHERE
    condition_id = NEW.condition_id;

END;

-- ============================================================================
-- 完了メッセージ
-- ============================================================================
-- 初期化完了の確認
SELECT
    'Database initialization completed successfully!' as status;
