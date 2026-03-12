import { Router } from 'express';
import { getDb } from '../db/connection.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

async function verifyHomeOwnership(homeId: string, userId: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`SELECT id FROM homes WHERE id = ${homeId} AND user_id = ${userId}`;
  return rows.length > 0;
}

async function verifyRoomOwnership(roomId: string, userId: number): Promise<any> {
  const sql = getDb();
  const [row] = await sql`
    SELECT r.* FROM rooms r
    JOIN homes h ON r.home_id = h.id
    WHERE r.id = ${roomId} AND h.user_id = ${userId}
  `;
  return row ?? null;
}

// GET /home/:homeId - list rooms for a home with project count
router.get('/home/:homeId', async (req: AuthRequest, res) => {
  if (!await verifyHomeOwnership(req.params.homeId as string, req.userId!)) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  const sql = getDb();
  const rooms = await sql`
    SELECT r.*,
      (SELECT COUNT(*) FROM projects WHERE room_id = r.id) AS project_count,
      (SELECT COUNT(*) FROM items WHERE room_id = r.id) AS item_count
    FROM rooms r
    WHERE r.home_id = ${req.params.homeId as string}
    ORDER BY r.name ASC
  `;
  res.json(rooms);
});

// GET /:id - get single room
router.get('/:id', async (req: AuthRequest, res) => {
  const room = await verifyRoomOwnership(req.params.id as string, req.userId!);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const sql = getDb();
  const [full] = await sql`
    SELECT r.*,
      (SELECT COUNT(*) FROM projects WHERE room_id = r.id) AS project_count,
      (SELECT COUNT(*) FROM items WHERE room_id = r.id) AS item_count
    FROM rooms r
    WHERE r.id = ${req.params.id}
  `;
  res.json(full);
});

// POST /home/:homeId - create room
router.post('/home/:homeId', async (req: AuthRequest, res) => {
  if (!await verifyHomeOwnership(req.params.homeId as string, req.userId!)) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  const sql = getDb();
  const { name, icon, floor, notes } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const [newRoom] = await sql`
    INSERT INTO rooms (home_id, name, icon, floor, notes)
    VALUES (${req.params.homeId as string}, ${name.trim()}, ${icon || null}, ${floor || null}, ${notes || null})
    RETURNING *
  `;
  res.status(201).json(newRoom);
});

// PUT /:id - update room
router.put('/:id', async (req: AuthRequest, res) => {
  const existing = await verifyRoomOwnership(req.params.id as string, req.userId!);
  if (!existing) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const sql = getDb();
  const { name, icon, floor, notes } = req.body;

  await sql`
    UPDATE rooms SET
      name = ${name ?? existing.name},
      icon = ${icon !== undefined ? (icon || null) : existing.icon},
      floor = ${floor !== undefined ? floor : existing.floor},
      notes = ${notes !== undefined ? notes : existing.notes},
      updated_at = NOW()
    WHERE id = ${req.params.id}
  `;

  const [room] = await sql`SELECT * FROM rooms WHERE id = ${req.params.id}`;
  res.json(room);
});

// DELETE /:id - delete room
router.delete('/:id', async (req: AuthRequest, res) => {
  if (!await verifyRoomOwnership(req.params.id as string, req.userId!)) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const sql = getDb();
  await sql`DELETE FROM rooms WHERE id = ${req.params.id}`;
  res.json({ message: 'Room deleted' });
});

export default router;
