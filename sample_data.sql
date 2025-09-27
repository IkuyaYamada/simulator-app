-- Sample data for testing Japanese stocks
INSERT INTO stocks (symbol, name, sector, industry) VALUES 
('7203', 'トヨタ自動車株式会社', '輸送用機器', '自動車・自動車部品'),
('6758', 'ソニーグループ株式会社', '電気機器', 'エレクトロニクス'),
('9984', '株式会社ファーストリテイリング', '小売業', 'アパレル'),
('6501', '株式会社日立製作所', '電気機器', '総合電機');

-- Sample simulation for Toyota (7203)
INSERT INTO simulations (simulation_id, symbol, initial_capital, start_date, end_date, status) VALUES
('test-simulation-7203', '7203', 1000000, '2024-01-01', '2024-12-31', 'active');

-- Sample checkpoint for the simulation
INSERT INTO checkpoints (checkpoint_id, simulation_id, checkpoint_date, checkpoint_type, note) VALUES
('test-checkpoint-7203', 'test-simulation-7203', '2024-01-15', 'manual', '年初の投資判断ポイント');