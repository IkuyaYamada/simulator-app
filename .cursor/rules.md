# 開発ルール

## 🚨 必須チェック項目

### 1. インポートパス
```typescript
// ✅ 正しい
import { useLoaderData, Link, useFetcher } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
return Response.json({ data: "value" });

// ❌ 間違い
import { json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
return json({ data: "value" });
```

### 2. データ取得
```typescript
// ✅ 正しい - FormDataを使用
const formData = await request.formData();
const symbol = formData.get("symbol") as string;

// ❌ 間違い - request.json()を使用
const body = await request.json();
const symbol = body.symbol;
```

### 3. 型安全性
```typescript
// ✅ 正しい
const data = useLoaderData<typeof loader>() as {
  simulations?: any[];
  error?: string;
};

// ❌ 間違い
const { simulations } = useLoaderData(); // 型不明
```

### 4. ルート設定
```typescript
// routes.ts に必ず追加
export default [
  index("routes/home.tsx"),
  route("/api/simulations", "routes/api.simulations.ts"), // ← 追加忘れ禁止
] satisfies RouteConfig;
```

### 5. データベースバインディング
```typescript
// ✅ 正しい - wrangler.jsoncと一致
const db = context.cloudflare.env.simulator_app_db;

// ❌ 間違い - 大文字
const db = context.cloudflare.env.SIMULATOR_APP_DB;
```

## ⚠️ よくあるミス

1. **インポートパスの間違い** - `@remix-run/*` を使用
2. **request.json()の使用** - `request.formData()` を使用すべき
3. **型の未指定** - `unknown` 型のまま使用
4. **ルート設定の漏れ** - `routes.ts`に新しいルートを追加し忘れ
5. **バインディング名の不一致** - 大文字小文字の違い
6. **デバッグログの残存** - 問題解決後は必ず削除
7. **言い訳をしない** - エラーの原因を簡潔に特定し、修正する

## 🔍 チェックリスト

新しいファイルを作成する前に：
- [ ] 既存の類似ファイルのインポート文を確認した
- [ ] 正しいパッケージからインポートしている
- [ ] TypeScriptの型を明示的に指定している
- [ ] エラーハンドリングを実装している
- [ ] lintエラーがないことを確認した
- [ ] **routes.tsにルートを追加した**
- [ ] **デバッグログを削除した**

エラーが発生した時：
- [ ] エラーメッセージを詳細に確認した
- [ ] 既存の正しいファイルと比較した
- [ ] 段階的に修正している
- [ ] 修正後に動作確認をした
- [ ] **言い訳せずに原因を特定した**

## 🎯 技術スタック

- **フロントエンド**: React (React Router v7)
- **バックエンド**: Cloudflare Workers
- **データベース**: Cloudflare D1 (SQLite)
- **スタイリング**: Tailwind CSS
- **言語**: TypeScript
