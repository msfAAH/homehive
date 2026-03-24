import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();
const UPLOADS_BASE = path.join(import.meta.dirname, '../../uploads');

async function verifyRoomOwnership(roomId: string, userId: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    SELECT r.id FROM rooms r
    JOIN homes h ON r.home_id = h.id
    WHERE r.id = ${Number(roomId)} AND h.user_id = ${userId}
  `;
  return rows.length > 0;
}

async function verifyItemOwnership(itemId: string, userId: number): Promise<any> {
  const sql = getDb();
  const [row] = await sql`
    SELECT i.* FROM items i
    JOIN rooms r ON i.room_id = r.id
    JOIN homes h ON r.home_id = h.id
    WHERE i.id = ${Number(itemId)} AND h.user_id = ${userId}
  `;
  return row ?? null;
}

// GET /room/:roomId - list items for a room with their attachments
router.get('/room/:roomId', async (req: AuthRequest, res) => {
  if (!await verifyRoomOwnership(req.params.roomId as string, req.userId!)) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const sql = getDb();
  const [items, attachments] = await Promise.all([
    sql`SELECT * FROM items WHERE room_id = ${Number(req.params.roomId)} ORDER BY name ASC`,
    sql`SELECT * FROM attachments WHERE item_id IN (SELECT id FROM items WHERE room_id = ${Number(req.params.roomId)}) ORDER BY created_at ASC`,
  ]);

  const result = items.map((item: any) => ({
    ...item,
    attachments: attachments.filter((a: any) => a.item_id === item.id),
  }));
  res.json(result);
});

// POST /room/:roomId - create item
router.post('/room/:roomId', async (req: AuthRequest, res) => {
  if (!await verifyRoomOwnership(req.params.roomId as string, req.userId!)) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const sql = getDb();
  const { name, category, brand, model, serial_number, purchase_date, purchase_price, warranty_expiry, notes } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const [item] = await sql`
    INSERT INTO items (room_id, name, category, brand, model, serial_number, purchase_date, purchase_price, warranty_expiry, notes)
    VALUES (${Number(req.params.roomId)}, ${name.trim()}, ${category || null}, ${brand?.trim() || null}, ${model?.trim() || null}, ${serial_number?.trim() || null}, ${purchase_date || null}, ${purchase_price != null ? Number(purchase_price) : null}, ${warranty_expiry || null}, ${notes?.trim() || null})
    RETURNING *
  `;
  res.status(201).json({ ...item, attachments: [] });
});

// PUT /:id - update item
router.put('/:id', async (req: AuthRequest, res) => {
  const existing = await verifyItemOwnership(req.params.id as string, req.userId!);
  if (!existing) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  const sql = getDb();
  const { name, category, brand, model, serial_number, purchase_date, purchase_price, warranty_expiry, notes } = req.body;

  await sql`
    UPDATE items SET
      name = ${name?.trim() ?? existing.name},
      category = ${category !== undefined ? (category || null) : existing.category},
      brand = ${brand !== undefined ? (brand?.trim() || null) : existing.brand},
      model = ${model !== undefined ? (model?.trim() || null) : existing.model},
      serial_number = ${serial_number !== undefined ? (serial_number?.trim() || null) : existing.serial_number},
      purchase_date = ${purchase_date !== undefined ? (purchase_date || null) : existing.purchase_date},
      purchase_price = ${purchase_price !== undefined ? (purchase_price != null ? Number(purchase_price) : null) : existing.purchase_price},
      warranty_expiry = ${warranty_expiry !== undefined ? (warranty_expiry || null) : existing.warranty_expiry},
      notes = ${notes !== undefined ? (notes?.trim() || null) : existing.notes},
      updated_at = NOW()
    WHERE id = ${req.params.id}
  `;

  const [[item], attachments] = await Promise.all([
    sql`SELECT * FROM items WHERE id = ${req.params.id}`,
    sql`SELECT * FROM attachments WHERE item_id = ${req.params.id} ORDER BY created_at ASC`,
  ]);
  res.json({ ...item, attachments });
});

// DELETE /:id - delete item and its attachment files
router.delete('/:id', async (req: AuthRequest, res) => {
  if (!await verifyItemOwnership(req.params.id as string, req.userId!)) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  const sql = getDb();
  const attachments = await sql`SELECT * FROM attachments WHERE item_id = ${req.params.id}`;
  for (const att of attachments) {
    const subdir = att.file_type === 'photo' ? 'photos' : 'documents';
    const filePath = path.join(UPLOADS_BASE, subdir, att.stored_name);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
  await sql`DELETE FROM items WHERE id = ${req.params.id}`;
  res.json({ message: 'Item deleted' });
});

export default router;
