import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { wrap } from '../middleware/asyncWrap.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

async function verifyHomeOwnership(homeId: string, userId: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`SELECT id FROM homes WHERE id = ${homeId} AND user_id = ${userId}`;
  return rows.length > 0;
}

async function verifyProjectOwnership(projectId: string, userId: number): Promise<any> {
  const sql = getDb();
  const [row] = await sql`
    SELECT p.* FROM projects p
    JOIN homes h ON p.home_id = h.id
    WHERE p.id = ${projectId} AND h.user_id = ${userId}
  `;
  return row ?? null;
}

// GET /home/:homeId - list projects for a home (with optional filters)
router.get('/home/:homeId', wrap(async (req, res) => {
  if (!await verifyHomeOwnership(req.params.homeId as string, req.userId!)) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  const sql = getDb();
  const { roomId, categoryId, status } = req.query;
  const rId = roomId ? Number(roomId) : null;
  const cId = categoryId ? Number(categoryId) : null;
  const st = status ? String(status) : null;

  const projects = await sql`
    SELECT p.*, r.name AS room_name, pc.name AS category_name
    FROM projects p
    LEFT JOIN rooms r ON p.room_id = r.id
    LEFT JOIN project_categories pc ON p.category_id = pc.id
    WHERE p.home_id = ${req.params.homeId as string}
      AND (${rId} IS NULL OR p.room_id = ${rId})
      AND (${cId} IS NULL OR p.category_id = ${cId})
      AND (${st} IS NULL OR p.status = ${st})
    ORDER BY p.created_at DESC
  `;
  res.json(projects);
}));

// GET /:id - get single project with line items and attachments
router.get('/:id', wrap(async (req, res) => {
  if (!await verifyProjectOwnership(req.params.id as string, req.userId!)) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const sql = getDb();
  const [project, lineItems, attachments, contractors] = await Promise.all([
    sql`
      SELECT p.*, r.name AS room_name, pc.name AS category_name
      FROM projects p
      LEFT JOIN rooms r ON p.room_id = r.id
      LEFT JOIN project_categories pc ON p.category_id = pc.id
      WHERE p.id = ${req.params.id}
    `,
    sql`SELECT * FROM line_items WHERE project_id = ${req.params.id} ORDER BY created_at ASC`,
    sql`SELECT * FROM attachments WHERE project_id = ${req.params.id} ORDER BY created_at DESC`,
    sql`SELECT * FROM contractors WHERE project_id = ${req.params.id} ORDER BY created_at ASC`,
  ]);

  res.json({ ...project[0], line_items: lineItems, attachments, contractors });
}));

// POST /home/:homeId - create project
router.post('/home/:homeId', wrap(async (req, res) => {
  if (!await verifyHomeOwnership(req.params.homeId as string, req.userId!)) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  const sql = getDb();
  const { name, description, room_id, category_id, status, year_created, estimated_cost, actual_cost } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const [project] = await sql`
    INSERT INTO projects (home_id, room_id, category_id, name, description, status, year_created, estimated_cost, actual_cost)
    VALUES (${req.params.homeId as string}, ${room_id || null}, ${category_id || null}, ${name.trim()}, ${description || null}, ${status || 'planned'}, ${year_created || null}, ${estimated_cost ?? 0}, ${actual_cost ?? 0})
    RETURNING *
  `;
  res.status(201).json(project);
}));

// PUT /:id - update project
router.put('/:id', wrap(async (req, res) => {
  const existing = await verifyProjectOwnership(req.params.id as string, req.userId!);
  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const sql = getDb();
  const { name, description, room_id, category_id, status, year_created, estimated_cost, actual_cost } = req.body;

  await sql`
    UPDATE projects SET
      name = ${name ?? existing.name},
      description = ${description !== undefined ? description : existing.description},
      room_id = ${room_id !== undefined ? (room_id || null) : existing.room_id},
      category_id = ${category_id !== undefined ? (category_id || null) : existing.category_id},
      status = ${status ?? existing.status},
      year_created = ${year_created !== undefined ? year_created : existing.year_created},
      estimated_cost = ${estimated_cost !== undefined ? estimated_cost : existing.estimated_cost},
      actual_cost = ${actual_cost !== undefined ? actual_cost : existing.actual_cost},
      updated_at = NOW()
    WHERE id = ${req.params.id}
  `;

  const [project] = await sql`SELECT * FROM projects WHERE id = ${req.params.id}`;
  res.json(project);
}));

// DELETE /:id - delete project
router.delete('/:id', wrap(async (req, res) => {
  if (!await verifyProjectOwnership(req.params.id as string, req.userId!)) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const sql = getDb();
  await sql`DELETE FROM projects WHERE id = ${req.params.id}`;
  res.json({ message: 'Project deleted' });
}));

export default router;
