import { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { v4 as uuidv4 } from 'uuid';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method === 'POST') {
    return createConditions(request, context);
  } else if (request.method === 'PUT') {
    return updateCondition(request, context);
  } else if (request.method === 'DELETE') {
    return deleteCondition(request, context);
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const simulationId = url.searchParams.get('simulationId');
  const checkpointId = url.searchParams.get('checkpointId');

  if (!simulationId) {
    return Response.json({ error: 'simulationId parameter is required' }, { status: 400 });
  }

  try {
    const db = context.cloudflare.env.DB;

    let query = `
      SELECT c.*, cp.checkpoint_date, cp.checkpoint_type
      FROM conditions c
      JOIN checkpoints cp ON c.checkpoint_id = cp.checkpoint_id
      WHERE cp.simulation_id = ?
    `;
    let params = [simulationId];

    if (checkpointId) {
      query += ' AND c.checkpoint_id = ?';
      params.push(checkpointId);
    }

    query += ' ORDER BY c.updated_at DESC';

    const conditions = await db.prepare(query).bind(...params).all();

    return Response.json({ conditions: conditions.results });
  } catch (error) {
    console.error('Error fetching conditions:', error);
    return Response.json({ error: 'Failed to fetch conditions' }, { status: 500 });
  }
}

async function createConditions(request: Request, context: any) {
  try {
    const formData = await request.formData();
    const simulationId = formData.get('simulationId') as string;
    const checkpointId = formData.get('checkpointId') as string;
    const conditionsData = formData.get('conditions') as string;

    if (!simulationId || !conditionsData) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const conditions = JSON.parse(conditionsData);
    const db = context.cloudflare.env.DB;

    // チェックポイントIDが指定されていない場合は、最新のチェックポイントを取得
    let targetCheckpointId = checkpointId;
    if (!targetCheckpointId) {
      const latestCheckpoint = await db.prepare(`
        SELECT checkpoint_id FROM checkpoints 
        WHERE simulation_id = ? 
        ORDER BY checkpoint_date DESC 
        LIMIT 1
      `).bind(simulationId).first();

      if (!latestCheckpoint) {
        return Response.json({ error: 'No checkpoint found for simulation' }, { status: 404 });
      }
      targetCheckpointId = latestCheckpoint.checkpoint_id;
    }

    // 既存の条件を削除（同じチェックポイントの条件を置き換え）
    await db.prepare(`
      DELETE FROM conditions WHERE checkpoint_id = ?
    `).bind(targetCheckpointId).run();

    // 新しい条件を挿入
    const insertPromises = conditions.map((condition: any) => {
      const conditionId = uuidv4();
      return db.prepare(`
        INSERT INTO conditions (condition_id, checkpoint_id, type, metric, value, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        conditionId,
        targetCheckpointId,
        condition.type,
        condition.metric,
        condition.value,
        true
      ).run();
    });

    await Promise.all(insertPromises);

    return Response.json({ 
      success: true, 
      message: `${conditions.length}件の条件を保存しました`,
      checkpointId: targetCheckpointId
    });
  } catch (error) {
    console.error('Error creating conditions:', error);
    return Response.json({ error: 'Failed to create conditions' }, { status: 500 });
  }
}

async function updateCondition(request: Request, context: any) {
  try {
    const formData = await request.formData();
    const conditionId = formData.get('conditionId') as string;
    const type = formData.get('type') as string;
    const metric = formData.get('metric') as string;
    const value = formData.get('value') as string;
    const isActive = formData.get('isActive') === 'true';

    if (!conditionId || !type || !metric || !value) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = context.cloudflare.env.DB;

    await db.prepare(`
      UPDATE conditions 
      SET type = ?, metric = ?, value = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE condition_id = ?
    `).bind(type, metric, value, isActive, conditionId).run();

    return Response.json({ success: true, message: '条件を更新しました' });
  } catch (error) {
    console.error('Error updating condition:', error);
    return Response.json({ error: 'Failed to update condition' }, { status: 500 });
  }
}

async function deleteCondition(request: Request, context: any) {
  try {
    const formData = await request.formData();
    const conditionId = formData.get('conditionId') as string;

    if (!conditionId) {
      return Response.json({ error: 'conditionId is required' }, { status: 400 });
    }

    const db = context.cloudflare.env.DB;

    await db.prepare(`
      DELETE FROM conditions WHERE condition_id = ?
    `).bind(conditionId).run();

    return Response.json({ success: true, message: '条件を削除しました' });
  } catch (error) {
    console.error('Error deleting condition:', error);
    return Response.json({ error: 'Failed to delete condition' }, { status: 500 });
  }
}
