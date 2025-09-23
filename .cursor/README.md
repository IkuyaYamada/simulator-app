# .cursor/ ディレクトリ

このディレクトリには、プロジェクト開発時に従うべきルールが含まれています。

## 📁 ファイル構成

### 📋 [rules.md](./rules.md)
**開発ルール（統合版）**
- 必須チェック項目
- よくあるミス
- チェックリスト
- 技術スタック

## 🎯 使用方法

### 新しいファイルを作成する前
1. [rules.md](./rules.md) の「必須チェック項目」を確認
2. [rules.md](./rules.md) の「チェックリスト」を実行

### エラーが発生した時
1. [rules.md](./rules.md) の「よくあるミス」で同様のミスがないか確認
2. [rules.md](./rules.md) の「チェックリスト」を実行

## 🔧 技術スタック

- **フロントエンド**: React (React Router v7)
- **バックエンド**: Cloudflare Workers
- **データベース**: Cloudflare D1 (SQLite)
- **スタイリング**: Tailwind CSS
- **言語**: TypeScript

## ⚠️ 重要な注意事項

### React Router v7 の特徴
- `@remix-run/*` パッケージは使用しない
- `react-router` から直接インポート
- `request.formData()` を使用（`request.json()` は使用しない）
- 型安全性を必ず確保

### データベース操作
- Cloudflare D1 を使用
- 外部キー制約を考慮した順序で操作
- エラーハンドリングを必ず実装

## 📞 サポート

これらのルールに従うことで、一貫性のある高品質なコードを維持できます。
