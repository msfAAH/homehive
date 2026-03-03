import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection.js';

const router = Router();
const UPLOADS_BASE = path.join(import.meta.dirname, '../../uploads');

// GET /room/:roomId - list items for a room with their attachments
router.get('/room/:roomId', (req, res) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM items WHERE room_id = ? ORDER BY name ASC').all(req.params.roomId) as any[];
  const attachments = db.prepare('SELECT * FROM attachments WHERE item_id IN (SELECT id FROM items WHERE room_id = ?) ORDER BY created_at ASC').all(req.params.roomId) as any[];

  const result = items.map((item) => ({
    ...item,
    attachments: attachments.filter((a) => a.item_id === item.id),
  }));
  res.json(result);
});

// POST /room/:roomId - create item
router.post('/room/:roomId', (req, res) => {
  const db = getDb();
  const { name, category, brand, model, serial_number, purchase_date, purchase_price, warranty_expiry, notes } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const room = db.prepare('SELECT id FROM rooms WHERE id = ?').get(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO items (room_id, name, category, brand, model, serial_number, purchase_date, purchase_price, warranty_expiry, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.roomId,
    name.trim(),
    category || null,
    brand?.trim() || null,
    model?.trim() || null,
    serial_number?.trim() || null,
    purchase_date || null,
    purchase_price != null ? Number(purchase_price) : null,
    warranty_expiry || null,
    notes?.trim() || null,
  );

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid) as any;
  res.status(201).json({ ...item, attachments: [] });
});

// PUT /:id - update item
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  const { name, category, brand, model, serial_number, purchase_date, purchase_price, warranty_expiry, notes } = req.body;

  db.prepare(`
    UPDATE items SET
      name = ?, category = ?, brand = ?, model = ?, serial_number = ?,
      purchase_date = ?, purchase_price = ?, warranty_expiry = ?, notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name?.trim() ?? existing.name,
    category !== undefined ? (category || null) : existing.category,
    brand !== undefined ? (brand?.trim() || null) : existing.brand,
    model !== undefined ? (model?.trim() || null) : existing.model,
    serial_number !== undefined ? (serial_number?.trim() || null) : existing.serial_number,
    purchase_date !== undefined ? (purchase_date || null) : existing.purchase_date,
    purchase_price !== undefined ? (purchase_price != null ? Number(purchase_price) : null) : existing.purchase_price,
    warranty_expiry !== undefined ? (warranty_expiry || null) : existing.warranty_expiry,
    notes !== undefined ? (notes?.trim() || null) : existing.notes,
    req.params.id,
  );

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id) as any;
  const attachments = db.prepare('SELECT * FROM attachments WHERE item_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ ...item, attachments });
});

// DELETE /:id - delete item and its attachment files
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  // Delete attachment files from disk
  const attachments = db.prepare('SELECT * FROM attachments WHERE item_id = ?').all(req.params.id) as any[];
  for (const att of attachments) {
    const subdir = att.file_type === 'photo' ? 'photos' : 'documents';
    const filePath = path.join(UPLOADS_BASE, subdir, att.stored_name);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
  db.prepare('DELETE FROM attachments WHERE item_id = ?').run(req.params.id);
  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  res.json({ message: 'Item deleted' });
});

export default router;
