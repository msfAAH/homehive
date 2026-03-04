import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection.js';
import upload from '../middleware/upload.js';
import type { AuthRequest } from '../middleware/auth.js';

const UPLOADS_PHOTOS = path.join(import.meta.dirname, '../../uploads/photos');

const router = Router();

// GET / - list all homes for the authenticated user
router.get('/', (req: AuthRequest, res) => {
  const db = getDb();
  const homes = db.prepare(`
    SELECT h.*,
      (SELECT COUNT(*) FROM rooms WHERE home_id = h.id) AS room_count,
      (SELECT COUNT(*) FROM projects WHERE home_id = h.id) AS project_count
    FROM homes h
    WHERE h.user_id = ?
    ORDER BY h.created_at DESC
  `).all(req.userId);
  res.json(homes);
});

// GET /:id - get single home (must belong to user)
router.get('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const home = db.prepare(`
    SELECT h.*,
      (SELECT COUNT(*) FROM rooms WHERE home_id = h.id) AS room_count,
      (SELECT COUNT(*) FROM projects WHERE home_id = h.id) AS project_count
    FROM homes h
    WHERE h.id = ? AND h.user_id = ?
  `).get(req.params.id, req.userId);

  if (!home) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }
  res.json(home);
});

// POST / - create home for authenticated user
router.post('/', (req: AuthRequest, res) => {
  const db = getDb();
  const { name, address, year_built, year_bought, notes } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO homes (name, address, year_built, year_bought, notes, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name.trim(), address || null, year_built || null, year_bought || null, notes || null, req.userId);

  const home = db.prepare('SELECT * FROM homes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(home);
});

// PUT /:id - update home (must belong to user)
router.put('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const { name, address, year_built, year_bought, notes } = req.body;

  const existing = db.prepare('SELECT * FROM homes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!existing) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  db.prepare(`
    UPDATE homes SET name = ?, address = ?, year_built = ?, year_bought = ?, notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? existing.name,
    address !== undefined ? address : existing.address,
    year_built !== undefined ? year_built : existing.year_built,
    year_bought !== undefined ? year_bought : existing.year_bought,
    notes !== undefined ? notes : existing.notes,
    req.params.id,
  );

  const home = db.prepare(`
    SELECT h.*,
      (SELECT COUNT(*) FROM rooms WHERE home_id = h.id) AS room_count,
      (SELECT COUNT(*) FROM projects WHERE home_id = h.id) AS project_count
    FROM homes h WHERE h.id = ?
  `).get(req.params.id);
  res.json(home);
});

// POST /:id/cover-photo - upload or replace cover photo
router.post('/:id/cover-photo', upload.single('photo'), (req: AuthRequest, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM homes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
  if (!existing) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No photo uploaded' });
    return;
  }

  // Delete old cover photo from disk if present
  if (existing.cover_photo) {
    const oldPath = path.join(UPLOADS_PHOTOS, existing.cover_photo);
    try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch { /* ignore */ }
  }

  db.prepare(`UPDATE homes SET cover_photo = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(file.filename, req.params.id);

  const home = db.prepare(`
    SELECT h.*,
      (SELECT COUNT(*) FROM rooms WHERE home_id = h.id) AS room_count,
      (SELECT COUNT(*) FROM projects WHERE home_id = h.id) AS project_count
    FROM homes h WHERE h.id = ?
  `).get(req.params.id);
  res.json(home);
});

// DELETE /:id - delete home (cascades, must belong to user)
router.delete('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM homes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  db.prepare('DELETE FROM homes WHERE id = ?').run(req.params.id);
  res.json({ message: 'Home deleted' });
});

export default router;
