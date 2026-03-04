import { Router } from 'express';
import { getDb } from '../db/connection.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

function recalculateProjectCost(projectId: number | string): void {
  const db = getDb();
  db.prepare(`
    UPDATE projects SET actual_cost = (
      SELECT COALESCE(SUM(total_cost), 0) FROM line_items WHERE project_id = ?
    ) WHERE id = ?
  `).run(projectId, projectId);
}

// Helper: verify project belongs to user
function verifyProjectOwnership(projectId: string | number, userId: number): boolean {
  const db = getDb();
  return !!db.prepare(`
    SELECT p.id FROM projects p
    JOIN homes h ON p.home_id = h.id
    WHERE p.id = ? AND h.user_id = ?
  `).get(projectId, userId);
}

// Helper: verify line item belongs to user (through project -> home)
function verifyLineItemOwnership(lineItemId: string | number, userId: number): any {
  const db = getDb();
  return db.prepare(`
    SELECT li.* FROM line_items li
    JOIN projects p ON li.project_id = p.id
    JOIN homes h ON p.home_id = h.id
    WHERE li.id = ? AND h.user_id = ?
  `).get(lineItemId, userId);
}

// GET /project/:projectId - list line items for a project
router.get('/project/:projectId', (req: AuthRequest, res) => {
  if (!verifyProjectOwnership(req.params.projectId, req.userId!)) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const db = getDb();
  const items = db.prepare(
    'SELECT * FROM line_items WHERE project_id = ? ORDER BY created_at ASC',
  ).all(req.params.projectId);
  res.json(items);
});

// POST /project/:projectId - create line item
router.post('/project/:projectId', (req: AuthRequest, res) => {
  if (!verifyProjectOwnership(req.params.projectId, req.userId!)) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const db = getDb();
  const projectId = req.params.projectId;
  const { description, quantity, unit_cost, vendor, notes } = req.body;

  if (!description || !description.trim()) {
    res.status(400).json({ error: 'Description is required' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO line_items (project_id, description, quantity, unit_cost, vendor, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    description.trim(),
    quantity ?? 1,
    unit_cost ?? 0,
    vendor || null,
    notes || null,
  );

  recalculateProjectCost(projectId);

  const item = db.prepare('SELECT * FROM line_items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(item);
});

// PUT /:id - update line item
router.put('/:id', (req: AuthRequest, res) => {
  const existing = verifyLineItemOwnership(req.params.id, req.userId!) as any;
  if (!existing) {
    res.status(404).json({ error: 'Line item not found' });
    return;
  }

  const db = getDb();
  const { description, quantity, unit_cost, vendor, notes } = req.body;

  db.prepare(`
    UPDATE line_items SET description = ?, quantity = ?, unit_cost = ?, vendor = ?, notes = ?
    WHERE id = ?
  `).run(
    description ?? existing.description,
    quantity !== undefined ? quantity : existing.quantity,
    unit_cost !== undefined ? unit_cost : existing.unit_cost,
    vendor !== undefined ? vendor : existing.vendor,
    notes !== undefined ? notes : existing.notes,
    req.params.id,
  );

  recalculateProjectCost(existing.project_id);

  const item = db.prepare('SELECT * FROM line_items WHERE id = ?').get(req.params.id);
  res.json(item);
});

// DELETE /:id - delete line item
router.delete('/:id', (req: AuthRequest, res) => {
  const existing = verifyLineItemOwnership(req.params.id, req.userId!) as any;
  if (!existing) {
    res.status(404).json({ error: 'Line item not found' });
    return;
  }

  const db = getDb();
  db.prepare('DELETE FROM line_items WHERE id = ?').run(req.params.id);
  recalculateProjectCost(existing.project_id);

  res.json({ message: 'Line item deleted' });
});

export default router;
