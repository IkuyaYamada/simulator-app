import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

// シミュレーション作成
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method === "POST") {
    return createSimulation(request, context);
  } else if (request.method === "DELETE") {
    return deleteSimulation(request, context);
  } else {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
}

async function createSimulation(request: Request, context: any) {

  try {
    
    // FormDataとして送信されるデータを取得
    const formData = await request.formData();
    const symbol = formData.get("symbol") as string;
    const companyName = formData.get("companyName") as string;
    const initialCapital = Number(formData.get("initialCapital"));
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;
    const tradingConditionsData = formData.get("tradingConditions") as string;

    // バリデーション
    if (!symbol || !initialCapital || !startDate || !endDate) {
      return Response.json({ 
        error: "Missing required fields: symbol, initialCapital, startDate, endDate" 
      }, { status: 400 });
    }

    // 売買条件のバリデーション
    if (!tradingConditionsData) {
      return Response.json({ 
        error: "売買条件が設定されていません" 
      }, { status: 400 });
    }

    let tradingConditions;
    try {
      tradingConditions = JSON.parse(tradingConditionsData);
    } catch (error) {
      return Response.json({ 
        error: "売買条件のデータ形式が正しくありません" 
      }, { status: 400 });
    }

    // 有効な売買条件のチェック
    const validConditions = tradingConditions.filter((condition: any) => 
      condition.type && condition.metric && condition.value && condition.value.trim() !== ''
    );

    if (validConditions.length === 0) {
      return Response.json({ 
        error: "少なくとも1つの有効な売買条件を設定してください" 
      }, { status: 400 });
    }

    if (initialCapital <= 0) {
      return Response.json({ 
        error: "Initial capital must be greater than 0" 
      }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return Response.json({ 
        error: "End date must be after start date" 
      }, { status: 400 });
    }

    const db = context.cloudflare.env.simulator_app_db;

    // 1. Stock テーブルから既存の銘柄を確認（symbolは primary key）
    let existingStock = await db.prepare(`
      SELECT * FROM stocks WHERE symbol = ?
    `).bind(symbol.toUpperCase()).first();

    if (!existingStock) {
      // 2. 新しい銘柄の場合、内部APIを呼び出して株価情報を取得
      try {
        // 内部APIを呼び出し - ベースURLをrequestから取得
        const baseUrl = new URL(request.url).origin;
        const stockInfoResponse = await fetch(`${baseUrl}/api/stock-info?symbol=${symbol}`);
        
        if (!stockInfoResponse.ok) {
          throw new Error(`Failed to fetch stock info: ${stockInfoResponse.status}`);
        }

        const stockInfo = await stockInfoResponse.json() as {
          longName?: string;
          shortName?: string;
          sector?: string;
          industry?: string;
        };

        // 送信されたcompanyNameを優先、なければAPIから取得した名前を使用
        const finalCompanyName = companyName?.trim() || stockInfo.longName || stockInfo.shortName || symbol.toUpperCase();

        await db.prepare(`
          INSERT INTO stocks (symbol, name, sector, industry)
          VALUES (?, ?, ?, ?)
        `).bind(
          symbol.toUpperCase(),
          finalCompanyName,
          stockInfo.sector || "不明",
          stockInfo.industry || "不明"
        ).run();
      } catch (error) {
        console.error("Failed to fetch stock info:", error);
        // フォールバック: 送信されたcompanyNameまたはsymbolを使用
        const fallbackName = companyName?.trim() || symbol.toUpperCase();
        await db.prepare(`
          INSERT INTO stocks (symbol, name, sector, industry)
          VALUES (?, ?, ?, ?)
        `).bind(
          symbol.toUpperCase(),
          fallbackName,
          "不明",
          "不明"
        ).run();
      }
    } else if (companyName?.trim() && existingStock.name !== companyName.trim()) {
      // 既存の銘柄でも、送信されたcompanyNameが異なる場合は更新
      await db.prepare(`
        UPDATE stocks SET name = ? WHERE symbol = ?
      `).bind(companyName.trim(), symbol.toUpperCase()).run();
    }

    // 株価データはシミュレーション詳細ページで必要に応じて取得する

    // 3. Simulation テーブルに新規レコード作成（明示的UTC保存）
    const simulationId = crypto.randomUUID();
    const nowUTC = new Date().toISOString(); // UTC時刻を明示的取得
    await db.prepare(`
      INSERT INTO simulations (simulation_id, symbol, initial_capital, start_date, end_date, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    `).bind(
      simulationId,
      symbol.toUpperCase(),
      initialCapital,
      startDate,
      endDate,
      nowUTC,
      nowUTC
    ).run();

    // 4. 最初のチェックポイント（チェックポイントゼロ）を自動作成（明示的UTC保存）
    const checkpointId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO checkpoints (checkpoint_id, simulation_id, checkpoint_date, checkpoint_type, note, created_at)
      VALUES (?, ?, ?, 'initial', 'シミュレーション開始時の初期チェックポイント', ?)
    `).bind(
      checkpointId,
      simulationId,
      startDate,
      nowUTC
    ).run();

    // 5. 売買条件を初期チェックポイントに関連付けて保存
    try {
      // バリデーション済みの有効な売買条件を挿入
      for (const condition of validConditions) {
        const conditionId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO conditions (condition_id, checkpoint_id, type, metric, value, is_active, updated_at)
          VALUES (?, ?, ?, ?, ?, TRUE, ?)
        `).bind(
          conditionId,
          checkpointId,
          condition.type,
          condition.metric,
          condition.value,
          nowUTC
        ).run();
      }
    } catch (error) {
      console.error("Failed to save trading conditions:", error);
      // 売買条件の保存に失敗した場合はエラーを返す
      return Response.json({ 
        error: "売買条件の保存に失敗しました" 
      }, { status: 500 });
    }

    return Response.json({
      simulationId,
      symbol: symbol.toUpperCase(),
      status: "created"
    });

  } catch (error) {
    console.error("Simulation creation error:", error);
    return Response.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

async function deleteSimulation(request: Request, context: any) {
  try {
    const formData = await request.formData();
    const simulationId = formData.get("simulationId") as string;

    if (!simulationId) {
      return Response.json({ error: "Simulation ID is required" }, { status: 400 });
    }

    const db = context.cloudflare.env.simulator_app_db;

    // 外部キー制約の順序で削除
    // 1. PnL記録を削除
    await db.prepare(`
      DELETE FROM pnl_records 
      WHERE checkpoint_id IN (
        SELECT checkpoint_id FROM checkpoints WHERE simulation_id = ?
      )
    `).bind(simulationId).run();

    // 2. 売買条件を削除
    await db.prepare(`
      DELETE FROM conditions 
      WHERE checkpoint_id IN (
        SELECT checkpoint_id FROM checkpoints WHERE simulation_id = ?
      )
    `).bind(simulationId).run();

    // 3. 投資仮説を削除
    await db.prepare(`
      DELETE FROM hypotheses 
      WHERE checkpoint_id IN (
        SELECT checkpoint_id FROM checkpoints WHERE simulation_id = ?
      )
    `).bind(simulationId).run();

    // 4. チェックポイントを削除
    await db.prepare(`
      DELETE FROM checkpoints WHERE simulation_id = ?
    `).bind(simulationId).run();

    // 5. 投資日記を削除
    await db.prepare(`
      DELETE FROM journals WHERE simulation_id = ?
    `).bind(simulationId).run();

    // 6. レビューを削除
    await db.prepare(`
      DELETE FROM reviews WHERE simulation_id = ?
    `).bind(simulationId).run();

    // 7. シミュレーションを削除
    await db.prepare(`
      DELETE FROM simulations WHERE simulation_id = ?
    `).bind(simulationId).run();

    return Response.json({ 
      success: true,
      message: "シミュレーションが削除されました"
    });

  } catch (error) {
    console.error("Simulation deletion error:", error);
    return Response.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// シミュレーション一覧取得
export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const db = context.cloudflare.env.simulator_app_db;

    const simulations = await db.prepare(`
      SELECT 
        s.simulation_id,
        s.symbol,
        s.initial_capital,
        s.start_date,
        s.end_date,
        s.status,
        s.created_at,
        st.name as stock_name,
        st.sector,
        st.industry
      FROM simulations s
      JOIN stocks st ON s.symbol = st.symbol
      ORDER BY s.created_at DESC
    `).all();

    return Response.json({ simulations: simulations.results });

  } catch (error) {
    console.error("Simulation list error:", error);
    return Response.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
