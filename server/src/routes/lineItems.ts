import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

function recalculateProjectCost(projectId: number | string): void {
  const db = getDb();
  db.prepare(`
    UPDATE projects SET actual_cost = (
      SELECT COALESCE(SUM(total_cost), 0) FROM line_items WHERE project_id = ?
    ) WHERE id = ?
  `).run(projectId, projectId);
}

// GET /project/:projectId - list line items for a project
router.get('/project/:projectId', (req, res) => {
  const db = getDb();
  const items = db.prepare(
    'SELECT * FROM line_items WHERE project_id = ? ORDER BY created_at ASC',
  ).all(req.params.projectId);
  res.json(items);
});

// POST /project/:projectId - create line item
router.post('/project/:projectId', (req, res) => {
  const db = getDb();
  const projectId = req.params.projectId;
  const { description, quantity, unit_cost, vendor, notes } = req.body;

  if (!description || !description.trim()) {
    res.status(400).json({ error: 'Description is required' });
    return;
  }

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
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
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM line_items WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Line item not found' });
    return;
  }

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
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM line_items WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Line item not found' });
    return;
  }

  db.prepare('DELETE FROM line_items WHERE id = ?').run(req.params.id);
  recalculateProjectCost(existing.project_id);

  res.json({ message: 'Line item deleted' });
});

export default router;
