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
    const initialCapital = Number(formData.get("initialCapital"));
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;

    // バリデーション
    if (!symbol || !initialCapital || !startDate || !endDate) {
      return Response.json({ 
        error: "Missing required fields: symbol, initialCapital, startDate, endDate" 
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

    // 1. Stock テーブルから既存の銘柄を確認
    let stockResult = await db.prepare(`
      SELECT stock_id FROM stocks WHERE symbol = ?
    `).bind(symbol).first();

    let stockId;
    if (stockResult) {
      stockId = stockResult.stock_id;
    } else {
      // 2. 新しい銘柄の場合、内部APIを呼び出して株価情報を取得
      try {
        const stockInfoResponse = await fetch(`/api/stock-info?symbol=${symbol}`);
        if (!stockInfoResponse.ok) {
          throw new Error(`Failed to fetch stock info: ${stockInfoResponse.status}`);
        }

        const stockInfo = await stockInfoResponse.json() as {
          longName?: string;
          shortName?: string;
          sector?: string;
          industry?: string;
        };
        
        stockId = crypto.randomUUID();

        await db.prepare(`
          INSERT INTO stocks (stock_id, symbol, name, sector, industry)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          stockId,
          symbol.toUpperCase(),
          stockInfo.longName || stockInfo.shortName || symbol.toUpperCase(),
          stockInfo.sector || "不明",
          stockInfo.industry || "不明"
        ).run();
      } catch (error) {
        console.error("Failed to fetch stock info:", error);
        // フォールバック: 基本的な情報で保存
        stockId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO stocks (stock_id, symbol, name, sector, industry)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          stockId,
          symbol.toUpperCase(),
          symbol.toUpperCase(),
          "不明",
          "不明"
        ).run();
      }
    }

    // 3. Simulation テーブルに新規レコード作成
    const simulationId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO simulations (simulation_id, stock_id, initial_capital, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).bind(
      simulationId,
      stockId,
      initialCapital,
      startDate,
      endDate
    ).run();

    return Response.json({
      simulationId,
      stockId,
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
        s.initial_capital,
        s.start_date,
        s.end_date,
        s.status,
        s.created_at,
        st.symbol,
        st.name as stock_name,
        st.sector,
        st.industry
      FROM simulations s
      JOIN stocks st ON s.stock_id = st.stock_id
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
