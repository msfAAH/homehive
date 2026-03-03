import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

// GET /home/:homeId - list rooms for a home with project count
router.get('/home/:homeId', (req, res) => {
  const db = getDb();
  const rooms = db.prepare(`
    SELECT r.*,
      (SELECT COUNT(*) FROM projects WHERE room_id = r.id) AS project_count,
      (SELECT COUNT(*) FROM items WHERE room_id = r.id) AS item_count
    FROM rooms r
    WHERE r.home_id = ?
    ORDER BY r.name ASC
  `).all(req.params.homeId);
  res.json(rooms);
});

// GET /:id - get single room
router.get('/:id', (req, res) => {
  const db = getDb();
  const room = db.prepare(`
    SELECT r.*,
      (SELECT COUNT(*) FROM projects WHERE room_id = r.id) AS project_count,
      (SELECT COUNT(*) FROM items WHERE room_id = r.id) AS item_count
    FROM rooms r
    WHERE r.id = ?
  `).get(req.params.id);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json(room);
});

// POST /home/:homeId - create room
router.post('/home/:homeId', (req, res) => {
  const db = getDb();
  const { name, icon, floor, notes } = req.body;
  const homeId = req.params.homeId;

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
    INSERT INTO rooms (home_id, name, icon, floor, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(homeId, name.trim(), icon || null, floor || null, notes || null);

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(room);
});

// PUT /:id - update room
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, icon, floor, notes } = req.body;

  const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  db.prepare(`
    UPDATE rooms SET name = ?, icon = ?, floor = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? existing.name,
    icon !== undefined ? (icon || null) : existing.icon,
    floor !== undefined ? floor : existing.floor,
    notes !== undefined ? notes : existing.notes,
    req.params.id,
  );

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  res.json(room);
});

// DELETE /:id - delete room
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM rooms WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
  res.json({ message: 'Room deleted' });
});

export default router;
