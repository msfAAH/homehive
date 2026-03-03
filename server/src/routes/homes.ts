import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection.js';
import upload from '../middleware/upload.js';

const UPLOADS_PHOTOS = path.join(import.meta.dirname, '../../uploads/photos');

const router = Router();

// GET / - list all homes with room count and project count
router.get('/', (_req, res) => {
  const db = getDb();
  const homes = db.prepare(`
    SELECT h.*,
      (SELECT COUNT(*) FROM rooms WHERE home_id = h.id) AS room_count,
      (SELECT COUNT(*) FROM projects WHERE home_id = h.id) AS project_count
    FROM homes h
    ORDER BY h.created_at DESC
  `).all();
  res.json(homes);
});

// GET /:id - get single home with counts
router.get('/:id', (req, res) => {
  const db = getDb();
  const home = db.prepare(`
    SELECT h.*,
      (SELECT COUNT(*) FROM rooms WHERE home_id = h.id) AS room_count,
      (SELECT COUNT(*) FROM projects WHERE home_id = h.id) AS project_count
    FROM homes h
    WHERE h.id = ?
  `).get(req.params.id);

  if (!home) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }
  res.json(home);
});

// POST / - create home
router.post('/', (req, res) => {
  const db = getDb();
  const { name, address, year_built, year_bought, notes } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO homes (name, address, year_built, year_bought, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(name.trim(), address || null, year_built || null, year_bought || null, notes || null);

  const home = db.prepare('SELECT * FROM homes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(home);
});

// PUT /:id - update home
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, address, year_built, year_bought, notes } = req.body;

  const existing = db.prepare('SELECT * FROM homes WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  db.prepare(`
    UPDATE homes SET name = ?, address = ?, year_built = ?, year_bought = ?, notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? (existing as any).name,
    address !== undefined ? address : (existing as any).address,
    year_built !== undefined ? year_built : (existing as any).year_built,
    year_bought !== undefined ? year_bought : (existing as any).year_bought,
    notes !== undefined ? notes : (existing as any).notes,
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
router.post('/:id/cover-photo', upload.single('photo'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM homes WHERE id = ?').get(req.params.id) as any;
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

// DELETE /:id - delete home (cascades)
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM homes WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  db.prepare('DELETE FROM homes WHERE id = ?').run(req.params.id);
  res.json({ message: 'Home deleted' });
});

export default router;
