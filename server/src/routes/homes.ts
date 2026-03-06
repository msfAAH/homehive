import { Router, type NextFunction, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection.js';
import upload from '../middleware/upload.js';
import type { AuthRequest } from '../middleware/auth.js';

const UPLOADS_PHOTOS = path.join(import.meta.dirname, '../../uploads/photos');

const router = Router();

const wrap = (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: AuthRequest, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// GET / - list all homes for the authenticated user
router.get('/', wrap(async (req, res) => {
  const sql = getDb();
  const homes = await sql`
    SELECT h.*,
      (SELECT COUNT(*) FROM rooms WHERE home_id = h.id) AS room_count,
      (SELECT COUNT(*) FROM projects WHERE home_id = h.id) AS project_count
    FROM homes h
    WHERE h.user_id = ${req.userId}
    ORDER BY h.created_at DESC
  `;
  res.json(homes);
}));

// GET /:id - get single home (must belong to user)
router.get('/:id', wrap(async (req, res) => {
  const sql = getDb();
  const [home] = await sql`
    SELECT h.*,
      (SELECT COUNT(*) FROM rooms WHERE home_id = h.id) AS room_count,
      (SELECT COUNT(*) FROM projects WHERE home_id = h.id) AS project_count
    FROM homes h
    WHERE h.id = ${req.params.id} AND h.user_id = ${req.userId}
  `;

  if (!home) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }
  res.json(home);
}));

// POST / - create home for authenticated user
router.post('/', wrap(async (req, res) => {
  const sql = getDb();
  const { name, address, year_built, year_bought, notes } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const [home] = await sql`
    INSERT INTO homes (name, address, year_built, year_bought, notes, user_id)
    VALUES (${name.trim()}, ${address || null}, ${year_built || null}, ${year_bought || null}, ${notes || null}, ${req.userId})
    RETURNING *
  `;
  res.status(201).json(home);
}));

// PUT /:id - update home (must belong to user)
router.put('/:id', wrap(async (req, res) => {
  const sql = getDb();
  const { name, address, year_built, year_bought, notes } = req.body;

  const [existing] = await sql`SELECT * FROM homes WHERE id = ${req.params.id} AND user_id = ${req.userId}`;
  if (!existing) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  await sql`
    UPDATE homes SET
      name = ${name ?? existing.name},
      address = ${address !== undefined ? address : existing.address},
      year_built = ${year_built !== undefined ? year_built : existing.year_built},
      year_bought = ${year_bought !== undefined ? year_bought : existing.year_bought},
      notes = ${notes !== undefined ? notes : existing.notes},
      updated_at = NOW()
    WHERE id = ${req.params.id}
  `;

  const [home] = await sql`
    SELECT h.*,
      (SELECT COUNT(*) FROM rooms WHERE home_id = h.id) AS room_count,
      (SELECT COUNT(*) FROM projects WHERE home_id = h.id) AS project_count
    FROM homes h WHERE h.id = ${req.params.id}
  `;
  res.json(home);
}));

// POST /:id/cover-photo - upload or replace cover photo
router.post('/:id/cover-photo', upload.single('photo'), wrap(async (req, res) => {
  const sql = getDb();
  const [existing] = await sql`SELECT * FROM homes WHERE id = ${req.params.id} AND user_id = ${req.userId}`;
  if (!existing) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No photo uploaded' });
    return;
  }

  if (existing.cover_photo) {
    const oldPath = path.join(UPLOADS_PHOTOS, existing.cover_photo);
    try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch { /* ignore */ }
  }

  await sql`UPDATE homes SET cover_photo = ${file.filename}, updated_at = NOW() WHERE id = ${req.params.id}`;

  const [home] = await sql`
    SELECT h.*,
      (SELECT COUNT(*) FROM rooms WHERE home_id = h.id) AS room_count,
      (SELECT COUNT(*) FROM projects WHERE home_id = h.id) AS project_count
    FROM homes h WHERE h.id = ${req.params.id}
  `;
  res.json(home);
}));

// DELETE /:id - delete home (cascades, must belong to user)
router.delete('/:id', wrap(async (req, res) => {
  const sql = getDb();
  const [existing] = await sql`SELECT id FROM homes WHERE id = ${req.params.id} AND user_id = ${req.userId}`;
  if (!existing) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  await sql`DELETE FROM homes WHERE id = ${req.params.id}`;
  res.json({ message: 'Home deleted' });
}));

export default router;
