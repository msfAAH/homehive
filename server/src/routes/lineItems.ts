import { Router } from 'express';
import { getDb } from '../db/connection.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

async function recalculateProjectCost(projectId: string | number): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE projects SET actual_cost = (
      SELECT COALESCE(SUM(total_cost), 0) FROM line_items WHERE project_id = ${projectId}
    ) WHERE id = ${projectId}
  `;
}

async function verifyProjectOwnership(projectId: string, userId: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    SELECT p.id FROM projects p
    JOIN homes h ON p.home_id = h.id
    WHERE p.id = ${projectId} AND h.user_id = ${userId}
  `;
  return rows.length > 0;
}

async function verifyLineItemOwnership(lineItemId: string, userId: number): Promise<any> {
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
router.get('/project/:projectId', async (req: AuthRequest, res) => {
  if (!await verifyProjectOwnership(req.params.projectId as string, req.userId!)) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const sql = getDb();
  const items = await sql`SELECT * FROM line_items WHERE project_id = ${req.params.projectId as string} ORDER BY created_at ASC`;
  res.json(items);
});

// POST /project/:projectId - create line item
router.post('/project/:projectId', async (req: AuthRequest, res) => {
  if (!await verifyProjectOwnership(req.params.projectId as string, req.userId!)) {
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
    VALUES (${req.params.projectId as string}, ${description.trim()}, ${quantity ?? 1}, ${unit_cost ?? 0}, ${vendor || null}, ${notes || null})
    RETURNING *
  `;

  await recalculateProjectCost(req.params.projectId as string);
  res.status(201).json(item);
});

// PUT /:id - update line item
router.put('/:id', async (req: AuthRequest, res) => {
  const existing = await verifyLineItemOwnership(req.params.id as string, req.userId!);
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

  await recalculateProjectCost(existing.project_id);

  const [item] = await sql`SELECT * FROM line_items WHERE id = ${req.params.id}`;
  res.json(item);
});

// DELETE /:id - delete line item
router.delete('/:id', async (req: AuthRequest, res) => {
  const existing = await verifyLineItemOwnership(req.params.id as string, req.userId!);
  if (!existing) {
    res.status(404).json({ error: 'Line item not found' });
    return;
  }

  const sql = getDb();
  await sql`DELETE FROM line_items WHERE id = ${req.params.id}`;
  await recalculateProjectCost(existing.project_id);
  res.json({ message: 'Line item deleted' });
});

export default router;
