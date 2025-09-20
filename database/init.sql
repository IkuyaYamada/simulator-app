-- 投資シミュレーションアプリケーション データベース初期化スクリプト
-- Cloudflare D1 (SQLite) 用
-- ============================================================================
-- テーブル作成
-- ============================================================================
-- 株式銘柄テーブル
CREATE TABLE
    IF NOT EXISTS stocks (
        stock_id TEXT PRIMARY KEY, -- UUID
        symbol TEXT NOT NULL UNIQUE, -- 銘柄コード (例: AAPL, NVDA)
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
        stock_id TEXT NOT NULL, -- 銘柄ID (FK)
        price_date DATE NOT NULL, -- 価格日付
        open_price DECIMAL(10, 2) NOT NULL, -- 始値
        close_price DECIMAL(10, 2) NOT NULL, -- 終値
        high_price DECIMAL(10, 2) NOT NULL, -- 高値
        low_price DECIMAL(10, 2) NOT NULL, -- 安値
        volume BIGINT, -- 出来高
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_cached BOOLEAN DEFAULT TRUE, -- キャッシュフラグ
        FOREIGN KEY (stock_id) REFERENCES stocks (stock_id),
        UNIQUE (stock_id, price_date)
    );

-- シミュレーションテーブル
CREATE TABLE
    IF NOT EXISTS simulations (
        simulation_id TEXT PRIMARY KEY, -- UUID
        stock_id TEXT NOT NULL, -- 銘柄ID (FK)
        initial_capital INTEGER NOT NULL, -- 初期資本
        start_date DATE NOT NULL, -- 開始日
        end_date DATE NOT NULL, -- 終了日
        status TEXT DEFAULT 'active', -- ステータス (active, completed, paused)
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (stock_id) REFERENCES stocks (stock_id)
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
CREATE INDEX IF NOT EXISTS idx_stock_prices_stock_date ON stock_prices (stock_id, price_date);

CREATE INDEX IF NOT EXISTS idx_stock_prices_date ON stock_prices (price_date);

-- シミュレーションのインデックス
CREATE INDEX IF NOT EXISTS idx_simulations_stock ON simulations (stock_id);

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
-- 初期データ挿入（サンプルデータ）
-- ============================================================================
-- サンプル銘柄データ
INSERT
OR IGNORE INTO stocks (stock_id, symbol, name, sector, industry)
VALUES
    (
        '550e8400-e29b-41d4-a716-446655440001',
        'AAPL',
        'Apple Inc.',
        'Technology',
        'Consumer Electronics'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440002',
        'NVDA',
        'NVIDIA Corporation',
        'Technology',
        'Semiconductors'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440003',
        'MSFT',
        'Microsoft Corporation',
        'Technology',
        'Software'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440004',
        'TSLA',
        'Tesla, Inc.',
        'Consumer Discretionary',
        'Electric Vehicles'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440005',
        'GOOGL',
        'Alphabet Inc.',
        'Technology',
        'Internet Services'
    );

-- サンプル株価データ（AAPL）
INSERT
OR IGNORE INTO stock_prices (
    stock_price_id,
    stock_id,
    price_date,
    open_price,
    close_price,
    high_price,
    low_price,
    volume
)
VALUES
    (
        '550e8400-e29b-41d4-a716-446655440101',
        '550e8400-e29b-41d4-a716-446655440001',
        '2024-01-15',
        185.50,
        187.20,
        188.10,
        185.20,
        45000000
    ),
    (
        '550e8400-e29b-41d4-a716-446655440102',
        '550e8400-e29b-41d4-a716-446655440001',
        '2024-01-16',
        187.20,
        186.80,
        187.50,
        186.20,
        42000000
    ),
    (
        '550e8400-e29b-41d4-a716-446655440103',
        '550e8400-e29b-41d4-a716-446655440001',
        '2024-01-17',
        186.80,
        188.50,
        189.20,
        186.50,
        48000000
    );

-- サンプル株価データ（NVDA）
INSERT
OR IGNORE INTO stock_prices (
    stock_price_id,
    stock_id,
    price_date,
    open_price,
    close_price,
    high_price,
    low_price,
    volume
)
VALUES
    (
        '550e8400-e29b-41d4-a716-446655440201',
        '550e8400-e29b-41d4-a716-446655440002',
        '2024-01-15',
        875.00,
        880.50,
        885.20,
        872.30,
        25000000
    ),
    (
        '550e8400-e29b-41d4-a716-446655440202',
        '550e8400-e29b-41d4-a716-446655440002',
        '2024-01-16',
        880.50,
        875.20,
        882.10,
        873.50,
        22000000
    ),
    (
        '550e8400-e29b-41d4-a716-446655440203',
        '550e8400-e29b-41d4-a716-446655440002',
        '2024-01-17',
        875.20,
        890.30,
        895.80,
        874.10,
        28000000
    );

-- サンプルシミュレーションデータ
INSERT
OR IGNORE INTO simulations (
    simulation_id,
    stock_id,
    initial_capital,
    start_date,
    end_date,
    status
)
VALUES
    (
        '550e8400-e29b-41d4-a716-446655440301',
        '550e8400-e29b-41d4-a716-446655440002',
        10000,
        '2024-01-15',
        '2024-07-15',
        'active'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440302',
        '550e8400-e29b-41d4-a716-446655440001',
        15000,
        '2024-02-01',
        '2024-08-01',
        'active'
    );

-- サンプルチェックポイントデータ
INSERT
OR IGNORE INTO checkpoints (
    checkpoint_id,
    simulation_id,
    checkpoint_date,
    checkpoint_type,
    note
)
VALUES
    (
        '550e8400-e29b-41d4-a716-446655440401',
        '550e8400-e29b-41d4-a716-446655440301',
        '2024-01-15',
        'manual',
        'シミュレーション開始'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440402',
        '550e8400-e29b-41d4-a716-446655440301',
        '2024-02-15',
        'manual',
        '四半期決算後のチェック'
    );

-- サンプル投資仮説データ
INSERT
OR IGNORE INTO hypotheses (
    hypothesis_id,
    checkpoint_id,
    description,
    is_active
)
VALUES
    (
        '550e8400-e29b-41d4-a716-446655440501',
        '550e8400-e29b-41d4-a716-446655440401',
        'AI需要の急激な増加でNVDAが上昇する',
        TRUE
    ),
    (
        '550e8400-e29b-41d4-a716-446655440502',
        '550e8400-e29b-41d4-a716-446655440401',
        'データセンター事業の成長が株価を押し上げる',
        TRUE
    );

-- サンプル売買条件データ
INSERT
OR IGNORE INTO conditions (
    condition_id,
    checkpoint_id,
    type,
    metric,
    value,
    is_active
)
VALUES
    (
        '550e8400-e29b-41d4-a716-446655440601',
        '550e8400-e29b-41d4-a716-446655440401',
        'buy',
        'price',
        '850.00',
        TRUE
    ),
    (
        '550e8400-e29b-41d4-a716-446655440602',
        '550e8400-e29b-41d4-a716-446655440401',
        'sell',
        'percentage',
        '20.0',
        TRUE
    ),
    (
        '550e8400-e29b-41d4-a716-446655440603',
        '550e8400-e29b-41d4-a716-446655440401',
        'stop_loss',
        'percentage',
        '-10.0',
        TRUE
    );

-- サンプル損益記録データ
INSERT
OR IGNORE INTO pnl_records (
    pnl_id,
    checkpoint_id,
    stock_price_id,
    position_size,
    realized_pl,
    unrealized_pl
)
VALUES
    (
        '550e8400-e29b-41d4-a716-446655440701',
        '550e8400-e29b-41d4-a716-446655440401',
        '550e8400-e29b-41d4-a716-446655440201',
        11.43,
        0.00,
        62.50
    );

-- サンプル投資日記データ
INSERT
OR IGNORE INTO journals (
    journal_id,
    simulation_id,
    checkpoint_id,
    title,
    content,
    journal_date
)
VALUES
    (
        '550e8400-e29b-41d4-a716-446655440801',
        '550e8400-e29b-41d4-a716-446655440301',
        '550e8400-e29b-41d4-a716-446655440401',
        'シミュレーション開始',
        'AI需要の増加を見込んでNVDAのシミュレーションを開始。初期資本10,000円で11.43株を購入。',
        '2024-01-15'
    );

-- ============================================================================
-- ビュー作成（便利なクエリ用）
-- ============================================================================
-- シミュレーション詳細ビュー
CREATE VIEW
    IF NOT EXISTS simulation_details AS
SELECT
    s.simulation_id,
    s.initial_capital,
    s.start_date,
    s.end_date,
    s.status,
    st.symbol,
    st.name as stock_name,
    st.sector,
    st.industry,
    s.created_at
FROM
    simulations s
    JOIN stocks st ON s.stock_id = st.stock_id;

-- 最新株価ビュー
CREATE VIEW
    IF NOT EXISTS latest_stock_prices AS
SELECT
    sp.stock_id,
    st.symbol,
    st.name,
    sp.price_date,
    sp.close_price,
    sp.volume,
    sp.last_updated
FROM
    stock_prices sp
    JOIN stocks st ON sp.stock_id = st.stock_id
WHERE
    sp.price_date = (
        SELECT
            MAX(price_date)
        FROM
            stock_prices sp2
        WHERE
            sp2.stock_id = sp.stock_id
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
    s.stock_id,
    st.symbol,
    st.name as stock_name
FROM
    checkpoints c
    JOIN simulations s ON c.simulation_id = s.simulation_id
    JOIN stocks st ON s.stock_id = st.stock_id
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
    stock_id = NEW.stock_id;

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
