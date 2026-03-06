import { Router, type NextFunction, type Response } from 'express';
import { getDb } from '../db/connection.js';
import { verifyProjectOwnership } from '../db/ownership.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

const wrap = (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

async function recalculateProjectCost(projectId: string | number): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE projects SET actual_cost = (
      SELECT COALESCE(SUM(total_cost), 0) FROM line_items WHERE project_id = ${projectId}
    ) WHERE id = ${projectId}
  `;
}

async function verifyLineItemOwnership(lineItemId: string, userId: number): Promise<Record<string, unknown> | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT li.* FROM line_items li
    JOIN projects p ON li.project_id = p.id
    JOIN homes h ON p.home_id = h.id
    WHERE li.id = ${lineItemId} AND h.user_id = ${userId}
  `;
  return row ?? null;
}

// GET /project/:projectId - list line items for a project
router.get('/project/:projectId', wrap(async (req, res) => {
  if (!await verifyProjectOwnership(req.params.projectId, req.userId!)) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const sql = getDb();
  const items = await sql`SELECT * FROM line_items WHERE project_id = ${req.params.projectId} ORDER BY created_at ASC`;
  res.json(items);
}));

// POST /project/:projectId - create line item
router.post('/project/:projectId', wrap(async (req, res) => {
  if (!await verifyProjectOwnership(req.params.projectId, req.userId!)) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const sql = getDb();
  const { description, quantity, unit_cost, vendor, notes } = req.body;

  if (!description || !description.trim()) {
    res.status(400).json({ error: 'Description is required' });
    return;
  }

  const [item] = await sql`
    INSERT INTO line_items (project_id, description, quantity, unit_cost, vendor, notes)
    VALUES (${req.params.projectId}, ${description.trim()}, ${quantity ?? 1}, ${unit_cost ?? 0}, ${vendor || null}, ${notes || null})
    RETURNING *
  `;

  await recalculateProjectCost(req.params.projectId);
  res.status(201).json(item);
}));

// PUT /:id - update line item
router.put('/:id', wrap(async (req, res) => {
  const existing = await verifyLineItemOwnership(req.params.id, req.userId!);
  if (!existing) {
    res.status(404).json({ error: 'Line item not found' });
    return;
  }

  const sql = getDb();
  const { description, quantity, unit_cost, vendor, notes } = req.body;

  await sql`
    UPDATE line_items SET
      description = ${description ?? existing.description},
      quantity = ${quantity !== undefined ? quantity : existing.quantity},
      unit_cost = ${unit_cost !== undefined ? unit_cost : existing.unit_cost},
      vendor = ${vendor !== undefined ? vendor : existing.vendor},
      notes = ${notes !== undefined ? notes : existing.notes}
    WHERE id = ${req.params.id}
  `;

  await recalculateProjectCost(existing.project_id as string);

  const [item] = await sql`SELECT * FROM line_items WHERE id = ${req.params.id}`;
  res.json(item);
}));

// DELETE /:id - delete line item
router.delete('/:id', wrap(async (req, res) => {
  const existing = await verifyLineItemOwnership(req.params.id, req.userId!);
  if (!existing) {
    res.status(404).json({ error: 'Line item not found' });
    return;
  }

  const sql = getDb();
  await sql`DELETE FROM line_items WHERE id = ${req.params.id}`;
  await recalculateProjectCost(existing.project_id as string);
  res.json({ message: 'Line item deleted' });
}));

export default router;
