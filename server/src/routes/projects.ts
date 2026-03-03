import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

// GET /home/:homeId - list projects for a home (with optional filters)
router.get('/home/:homeId', (req, res) => {
  const db = getDb();
  const { roomId, categoryId, status } = req.query;

  let sql = `
    SELECT p.*,
      r.name AS room_name,
      pc.name AS category_name
    FROM projects p
    LEFT JOIN rooms r ON p.room_id = r.id
    LEFT JOIN project_categories pc ON p.category_id = pc.id
    WHERE p.home_id = ?
  `;
  const params: any[] = [req.params.homeId];

  if (roomId) {
    sql += ' AND p.room_id = ?';
    params.push(roomId);
  }
  if (categoryId) {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }
  if (status) {
    sql += ' AND p.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY p.created_at DESC';

  const projects = db.prepare(sql).all(...params);
  res.json(projects);
});

// GET /:id - get single project with line items and attachments
router.get('/:id', (req, res) => {
  const db = getDb();
  const project = db.prepare(`
    SELECT p.*,
      r.name AS room_name,
      pc.name AS category_name
    FROM projects p
    LEFT JOIN rooms r ON p.room_id = r.id
    LEFT JOIN project_categories pc ON p.category_id = pc.id
    WHERE p.id = ?
  `).get(req.params.id) as any;

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const lineItems = db.prepare('SELECT * FROM line_items WHERE project_id = ? ORDER BY created_at ASC').all(req.params.id);
  const attachments = db.prepare('SELECT * FROM attachments WHERE project_id = ? ORDER BY created_at DESC').all(req.params.id);
  const contractors = db.prepare('SELECT * FROM contractors WHERE project_id = ? ORDER BY created_at ASC').all(req.params.id);

  res.json({ ...project, line_items: lineItems, attachments, contractors });
});

// POST /home/:homeId - create project
router.post('/home/:homeId', (req, res) => {
  const db = getDb();
  const homeId = req.params.homeId;
  const { name, description, room_id, category_id, status, year_created, estimated_cost, actual_cost } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const home = db.prepare('SELECT id FROM homes WHERE id = ?').get(homeId);
  if (!home) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO projects (home_id, room_id, category_id, name, description, status, year_created, estimated_cost, actual_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    homeId,
    room_id || null,
    category_id || null,
    name.trim(),
    description || null,
    status || 'planned',
    year_created || null,
    estimated_cost ?? 0,
    actual_cost ?? 0,
  );

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(project);
});

// PUT /:id - update project
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const { name, description, room_id, category_id, status, year_created, estimated_cost, actual_cost } = req.body;

  db.prepare(`
    UPDATE projects SET
      name = ?, description = ?, room_id = ?, category_id = ?,
      status = ?, year_created = ?, estimated_cost = ?, actual_cost = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? existing.name,
    description !== undefined ? description : existing.description,
    room_id !== undefined ? (room_id || null) : existing.room_id,
    category_id !== undefined ? (category_id || null) : existing.category_id,
    status ?? existing.status,
    year_created !== undefined ? year_created : existing.year_created,
    estimated_cost !== undefined ? estimated_cost : existing.estimated_cost,
    actual_cost !== undefined ? actual_cost : existing.actual_cost,
    req.params.id,
  );

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(project);
});

// DELETE /:id - delete project
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ message: 'Project deleted' });
});

export default router;
