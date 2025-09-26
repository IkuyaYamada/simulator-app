import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

// チェックポイント操作用
export async function action({ request, context }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // パスからoperationタイプ判断
  if (pathname === "/api/checkpoints" && request.method === "POST") {
    return createCheckpoint(request, context);
  } else if (pathname.includes("/update") && request.method === "PUT") {
    return updateCheckpoint(request, context);
  } else if (pathname.includes("/delete") && request.method === "DELETE") {
    return deleteCheckpoint(request, context);
  } else {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
}

// チェックポイント作成
async function createCheckpoint(request: Request, context: any) {
  try {
    const formData = await request.formData();
    const simulationId = formData.get("simulationId") as string;
    const checkpointType = formData.get("checkpointType") as string; // manual, auto_buy, auto_sell
    const checkpointDate = formData.get("checkpointDate") as string;
    const note = formData.get("note") as string || "";
    
    // 投資仮説データ（複数ある可能性）
    const hypotheses = formData.getAll("hypotheses") as string[];
    
    // 売買条件データ（複数ある可能性）
    const conditions = JSON.parse(formData.get("conditions") as string || "[]");

    // バリデーション
    if (!simulationId || !checkpointType || !checkpointDate) {
      return Response.json({
        error: "Missing required fields: simulationId, checkpointType, checkpointDate"
      }, { status: 400 });
    }

    // シミュレーション存在確認
    const db = context.cloudflare.env.simulator_app_db;
    const simulation = await db.prepare(
      "SELECT simulation_id FROM simulations WHERE simulation_id = ?"
    ).bind(simulationId).first();

    if (!simulation) {
      return Response.json({ error: "Simulation not found" }, { status: 404 });
    }

    // チェックポイント作成（明示的UTC保存）
    const checkpointId = crypto.randomUUID();
    const nowUTC = new Date().toISOString(); // UTC時刻を明示的取得
    await db.prepare(`
      INSERT INTO checkpoints (checkpoint_id, simulation_id, checkpoint_date, checkpoint_type, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      checkpointId,
      simulationId,
      checkpointDate,
      checkpointType,
      note,
      nowUTC
    ).run();

    // 投資仮説の挿入
    if (hypotheses && hypotheses.length > 0) {
      for (const hypothesis of hypotheses) {
        if (hypothesis.trim()) {
          await db.prepare(`
            INSERT INTO hypotheses (hypothesis_id, checkpoint_id, description, is_active)
            VALUES (?, ?, ?, 1)
          `).bind(
            crypto.randomUUID(),
            checkpointId,
            hypothesis.trim()
          ).run();
        }
      }
    }

    // 売買条件の挿入
    if (conditions && conditions.length > 0) {
      for (const condition of conditions) {
        await db.prepare(`
          INSERT INTO conditions (condition_id, checkpoint_id, type, metric, value, is_active)
          VALUES (?, ?, ?, ?, ?, 1)
        `).bind(
          crypto.randomUUID(),
          checkpointId,
          condition.type || "",
          condition.metric || "",
          condition.value || "",
        ).run();
      }
    }

    return Response.json({
      success: true,
      checkpointId,
      message: "チェックポイントが作成されました"
    });

  } catch (error) {
    console.error("Checkpoint creation error:", error);
    return Response.json({
      error: "内部サーバーエラー"
    }, { status: 500 });
  }
}

// チェックポイント更新
async function updateCheckpoint(request: Request, context: any) {
  try {
    const url = new URL(request.url);
    const checkpointId = url.pathname.split('/').pop()?.replace('/update', '');
    
    if (!checkpointId) {
      return Response.json({ error: "Checkpoint ID is required" }, { status: 400 });
    }

    const formData = await request.formData();
    const checkpointType = formData.get("checkpointType") as string;
    const checkpointDate = formData.get("checkpointDate") as string;
    const note = formData.get("note") as string;

    const db = context.cloudflare.env.simulator_app_db;

    // バリデーション
    if (!checkpointType || !checkpointDate) {
      return Response.json({
        error: "Missing required fields: checkpointType, checkpointDate"
      }, { status: 400 });
    }

    // チェックポイント更新
    const result = await db.prepare(`
      UPDATE checkpoints 
      SET checkpoint_type = ?, checkpoint_date = ?, note = ?
      WHERE checkpoint_id = ?
    `).bind(checkpointType, checkpointDate, note || "", checkpointId).run();

    if (result.changes === 0) {
      return Response.json({ error: "チェックポイントが見つかりません" }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: "チェックポイントが更新されました"
    });

  } catch (error) {
    console.error("Checkpoint update error:", error);
    return Response.json({
      error: "内部サーバーエラー"
    }, { status: 500 });
  }
}

// チェックポイント削除
async function deleteCheckpoint(request: Request, context: any) {
  try {
    const url = new URL(request.url);
    const checkpointId = url.pathname.split('/').pop()?.replace('/delete', '');
    
    if (!checkpointId) {
      return Response.json({ error: "Checkpoint ID is required" }, { status: 400 });
    }

    const db = context.cloudflare.env.simulator_app_db;

    // 外部キー制約の順序で削除
    // 1. PnL記録を削除
    await db.prepare(`
      DELETE FROM pnl_records WHERE checkpoint_id = ?
    `).bind(checkpointId).run();

    // 2. 売買条件を削除
    await db.prepare(`
      DELETE FROM conditions WHERE checkpoint_id = ?
    `).bind(checkpointId).run();

    // 3. 投資仮説を削除
    await db.prepare(`
      DELETE FROM hypotheses WHERE checkpoint_id = ?
    `).bind(checkpointId).run();

    // 4. チェックポイントを削除
    const result = await db.prepare(`
      DELETE FROM checkpoints WHERE checkpoint_id = ?
    `).bind(checkpointId).run();

    if (result.changes === 0) {
      return Response.json({ error: "チェックポイントが見つかりません" }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: "チェックポイントが削除されました"
    });

  } catch (error) {
    console.error("Checkpoint deletion error:", error);
    return Response.json({
      error: "内部サーバーエラー"
    }, { status: 500 });
  }
}

// チェックポイント一覧取得
export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // シミュレーションID別で取得
    if (pathname.includes("/api/checkpoints/")) {
      const simulationId = pathname.split('/').pop();
      
      if (!simulationId || simulationId === "checkpoints") {
        return Response.json({ error: "Simulation ID is required" }, { status: 400 });
      }

      const db = context.cloudflare.env.simulator_app_db;

      // チェックポイント一覧を取得
      const checkpoints = await db.prepare(`
        SELECT 
          c.*,
          COUNT(DISTINCT h.hypothesis_id) as hypothesis_count,
          COUNT(DISTINCT cond.condition_id) as condition_count,
          COUNT(DISTINCT pl.pnl_id) as pnl_count
        FROM checkpoints c
        LEFT JOIN hypotheses h ON c.checkpoint_id = h.checkpoint_id
        LEFT JOIN conditions cond ON c.checkpoint_id = cond.checkpoint_id AND cond.is_active = 1
        LEFT JOIN pnl_records pl ON c.checkpoint_id = pl.checkpoint_id
        WHERE c.simulation_id = ?
        GROUP BY c.checkpoint_id
        ORDER BY c.checkpoint_date DESC
      `).bind(simulationId).all();

      // 投資仮説と売買条件の詳細も取得
      const hypothesisData = await db.prepare(`
        SELECT hypothesis_id, checkpoint_id, description, is_active
        FROM hypotheses 
        WHERE checkpoint_id IN (
          SELECT checkpoint_id FROM checkpoints WHERE simulation_id = ?
        )
        ORDER BY updated_at DESC
      `).bind(simulationId).all();

      const conditionData = await db.prepare(`
        SELECT condition_id, checkpoint_id, type, metric, value, is_active
        FROM conditions 
        WHERE checkpoint_id IN (
          SELECT checkpoint_id FROM checkpoints WHERE simulation_id = ?
        )
        ORDER BY updated_at DESC
      `).bind(simulationId).all();

      return Response.json({
        checkpoints: checkpoints.results || [],
        hypotheses: hypothesisData.results || [],
        conditions: conditionData.results || []
      });
    }

    // 単一のチェックポイント取得
    const checkpointId = pathname.split('/').pop();
    if (checkpointId && checkpointId !== "checkpoints") {
      const db = context.cloudflare.env.simulator_app_db;

      const checkpoint = await db.prepare(`
        SELECT * FROM checkpoints WHERE checkpoint_id = ?
      `).bind(checkpointId).first();

      if (!checkpoint) {
        return Response.json({ error: "チェックポイントが見つかりません" }, { status: 404 });
      }

      return Response.json({ checkpoint });
    }

    return Response.json({ error: "Invalid request" }, { status: 400 });

  } catch (error) {
    console.error("Checkpoint loader error:", error);
    return Response.json({
      error: "内部サーバーエラー"
    }, { status: 500 });
  }
}
