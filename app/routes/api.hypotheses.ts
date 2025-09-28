import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

// 仮説データのCRUD操作
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method === "POST") {
    return createHypothesis(request, context);
  } else if (request.method === "PUT") {
    return updateHypothesis(request, context);
  } else if (request.method === "DELETE") {
    return deleteHypothesis(request, context);
  } else {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
}

// 仮説作成
async function createHypothesis(request: Request, context: any) {
  try {
    const formData = await request.formData();
    const checkpointId = formData.get("checkpointId") as string;
    const description = formData.get("description") as string;
    const factorType = formData.get("factor_type") as string;
    const priceImpact = parseInt(formData.get("price_impact") as string);
    const confidenceLevel = parseInt(formData.get("confidence_level") as string);

    // バリデーション
    if (!checkpointId || !description || !factorType || isNaN(priceImpact) || isNaN(confidenceLevel)) {
      return Response.json({ 
        error: "Missing required fields: checkpointId, description, factor_type, price_impact, confidence_level" 
      }, { status: 400 });
    }

    if (!['positive', 'negative'].includes(factorType)) {
      return Response.json({ 
        error: "factor_type must be 'positive' or 'negative'" 
      }, { status: 400 });
    }

    if (priceImpact < -5 || priceImpact > 5) {
      return Response.json({ 
        error: "price_impact must be between -5 and 5" 
      }, { status: 400 });
    }

    if (confidenceLevel < 1 || confidenceLevel > 5) {
      return Response.json({ 
        error: "confidence_level must be between 1 and 5" 
      }, { status: 400 });
    }

    const db = context.cloudflare.env.simulator_app_db;
    const hypothesisId = crypto.randomUUID();
    const nowUTC = new Date().toISOString();

    await db.prepare(`
      INSERT INTO hypotheses (hypothesis_id, checkpoint_id, description, factor_type, price_impact, confidence_level, is_active, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)
    `).bind(
      hypothesisId,
      checkpointId,
      description.trim(),
      factorType,
      priceImpact,
      confidenceLevel,
      nowUTC
    ).run();

    return Response.json({
      hypothesisId,
      status: "created"
    });

  } catch (error) {
    console.error("Hypothesis creation error:", error);
    return Response.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// 仮説更新
async function updateHypothesis(request: Request, context: any) {
  try {
    const formData = await request.formData();
    const hypothesisId = formData.get("hypothesisId") as string;
    const description = formData.get("description") as string;
    const factorType = formData.get("factor_type") as string;
    const priceImpact = parseInt(formData.get("price_impact") as string);
    const confidenceLevel = parseInt(formData.get("confidence_level") as string);

    // バリデーション
    if (!hypothesisId || !description || !factorType || isNaN(priceImpact) || isNaN(confidenceLevel)) {
      return Response.json({ 
        error: "Missing required fields: hypothesisId, description, factor_type, price_impact, confidence_level" 
      }, { status: 400 });
    }

    if (!['positive', 'negative'].includes(factorType)) {
      return Response.json({ 
        error: "factor_type must be 'positive' or 'negative'" 
      }, { status: 400 });
    }

    if (priceImpact < -5 || priceImpact > 5) {
      return Response.json({ 
        error: "price_impact must be between -5 and 5" 
      }, { status: 400 });
    }

    if (confidenceLevel < 1 || confidenceLevel > 5) {
      return Response.json({ 
        error: "confidence_level must be between 1 and 5" 
      }, { status: 400 });
    }

    const db = context.cloudflare.env.simulator_app_db;
    const nowUTC = new Date().toISOString();

    const result = await db.prepare(`
      UPDATE hypotheses 
      SET description = ?, factor_type = ?, price_impact = ?, confidence_level = ?, updated_at = ?
      WHERE hypothesis_id = ?
    `).bind(
      description.trim(),
      factorType,
      priceImpact,
      confidenceLevel,
      nowUTC,
      hypothesisId
    ).run();

    if (result.changes === 0) {
      return Response.json({ 
        error: "Hypothesis not found" 
      }, { status: 404 });
    }

    return Response.json({
      hypothesisId,
      status: "updated"
    });

  } catch (error) {
    console.error("Hypothesis update error:", error);
    return Response.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// 仮説削除
async function deleteHypothesis(request: Request, context: any) {
  try {
    const formData = await request.formData();
    const hypothesisId = formData.get("hypothesisId") as string;

    if (!hypothesisId) {
      return Response.json({ 
        error: "hypothesisId is required" 
      }, { status: 400 });
    }

    const db = context.cloudflare.env.simulator_app_db;

    const result = await db.prepare(`
      DELETE FROM hypotheses WHERE hypothesis_id = ?
    `).bind(hypothesisId).run();

    if (result.changes === 0) {
      return Response.json({ 
        error: "Hypothesis not found" 
      }, { status: 404 });
    }

    return Response.json({
      hypothesisId,
      status: "deleted"
    });

  } catch (error) {
    console.error("Hypothesis deletion error:", error);
    return Response.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// チェックポイントの仮説一覧取得
export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const checkpointId = url.searchParams.get("checkpointId");

    if (!checkpointId) {
      return Response.json({ 
        error: "checkpointId is required" 
      }, { status: 400 });
    }

    const db = context.cloudflare.env.simulator_app_db;

    const hypotheses = await db.prepare(`
      SELECT 
        h.hypothesis_id,
        h.checkpoint_id,
        h.description,
        h.factor_type,
        h.price_impact,
        h.confidence_level,
        h.is_active,
        h.updated_at
      FROM hypotheses h
      WHERE h.checkpoint_id = ?
      ORDER BY h.factor_type, h.updated_at DESC
    `).bind(checkpointId).all();

    // リスクスコアを計算
    const hypothesesWithRiskScore = hypotheses.results.map((h: any) => ({
      ...h,
      risk_score: h.price_impact * h.confidence_level
    }));

    // 総合リスクスコアを計算
    const totalRiskScore = hypothesesWithRiskScore.reduce((total: number, h: any) => total + h.risk_score, 0);

    return Response.json({ 
      hypotheses: hypothesesWithRiskScore,
      totalRiskScore
    });

  } catch (error) {
    console.error("Hypotheses list error:", error);
    return Response.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
