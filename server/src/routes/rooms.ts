import { Router } from 'express';
import { getDb } from '../db/connection.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper: verify home belongs to user
function verifyHomeOwnership(homeId: string, userId: number): boolean {
  const db = getDb();
  const home = db.prepare('SELECT id FROM homes WHERE id = ? AND user_id = ?').get(homeId, userId);
  return !!home;
}

// Helper: verify room belongs to user (through home)
function verifyRoomOwnership(roomId: string, userId: number): any {
  const db = getDb();
  return db.prepare(`
    SELECT r.* FROM rooms r
    JOIN homes h ON r.home_id = h.id
    WHERE r.id = ? AND h.user_id = ?
  `).get(roomId, userId);
}

// GET /home/:homeId - list rooms for a home with project count
router.get('/home/:homeId', (req: AuthRequest, res) => {
  if (!verifyHomeOwnership(req.params.homeId, req.userId!)) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

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
router.get('/:id', (req: AuthRequest, res) => {
  const room = verifyRoomOwnership(req.params.id, req.userId!);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const db = getDb();
  const full = db.prepare(`
    SELECT r.*,
      (SELECT COUNT(*) FROM projects WHERE room_id = r.id) AS project_count,
      (SELECT COUNT(*) FROM items WHERE room_id = r.id) AS item_count
    FROM rooms r
    WHERE r.id = ?
  `).get(req.params.id);
  res.json(full);
});

// POST /home/:homeId - create room
router.post('/home/:homeId', (req: AuthRequest, res) => {
  if (!verifyHomeOwnership(req.params.homeId, req.userId!)) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  const db = getDb();
  const { name, icon, floor, notes } = req.body;
  const homeId = req.params.homeId;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO rooms (home_id, name, icon, floor, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(homeId, name.trim(), icon || null, floor || null, notes || null);

  const newRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newRoom);
});

// PUT /:id - update room
router.put('/:id', (req: AuthRequest, res) => {
  const existing = verifyRoomOwnership(req.params.id, req.userId!) as any;
  if (!existing) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const db = getDb();
  const { name, icon, floor, notes } = req.body;

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
router.delete('/:id', (req: AuthRequest, res) => {
  if (!verifyRoomOwnership(req.params.id, req.userId!)) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const db = getDb();
  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
  res.json({ message: 'Room deleted' });
});

export default router;
