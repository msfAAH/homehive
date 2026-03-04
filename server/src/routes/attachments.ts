import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection.js';
import upload from '../middleware/upload.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();
const UPLOADS_BASE = path.join(import.meta.dirname, '../../uploads');

// Helper: verify that an entity belongs to the user
function verifyEntityOwnership(entityType: string, entityId: string | number, userId: number): boolean {
  const db = getDb();
  switch (entityType) {
    case 'home':
      return !!db.prepare('SELECT id FROM homes WHERE id = ? AND user_id = ?').get(entityId, userId);
    case 'room':
      return !!db.prepare(`
        SELECT r.id FROM rooms r JOIN homes h ON r.home_id = h.id
        WHERE r.id = ? AND h.user_id = ?
      `).get(entityId, userId);
    case 'project':
      return !!db.prepare(`
        SELECT p.id FROM projects p JOIN homes h ON p.home_id = h.id
        WHERE p.id = ? AND h.user_id = ?
      `).get(entityId, userId);
    case 'item':
      return !!db.prepare(`
        SELECT i.id FROM items i JOIN rooms r ON i.room_id = r.id JOIN homes h ON r.home_id = h.id
        WHERE i.id = ? AND h.user_id = ?
      `).get(entityId, userId);
    default:
      return false;
  }
}

// Helper: verify attachment belongs to user
function verifyAttachmentOwnership(attachmentId: string | number, userId: number): any {
  const db = getDb();
  const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(attachmentId) as any;
  if (!att) return null;

  // Check ownership through whichever entity the attachment belongs to
  if (att.home_id && verifyEntityOwnership('home', att.home_id, userId)) return att;
  if (att.room_id && verifyEntityOwnership('room', att.room_id, userId)) return att;
  if (att.project_id && verifyEntityOwnership('project', att.project_id, userId)) return att;
  if (att.item_id && verifyEntityOwnership('item', att.item_id, userId)) return att;

  return null;
}

// GET / - list attachments filtered by query params
router.get('/', (req: AuthRequest, res) => {
  const db = getDb();
  const { homeId, roomId, projectId, itemId } = req.query;

  // Verify ownership of the requested entity
  if (homeId && !verifyEntityOwnership('home', homeId as string, req.userId!)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (roomId && !verifyEntityOwnership('room', roomId as string, req.userId!)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (projectId && !verifyEntityOwnership('project', projectId as string, req.userId!)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (itemId && !verifyEntityOwnership('item', itemId as string, req.userId!)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  let sql = 'SELECT * FROM attachments WHERE 1=1';
  const params: any[] = [];

  if (homeId) {
    sql += ' AND home_id = ?';
    params.push(homeId);
  }
  if (roomId) {
    sql += ' AND room_id = ?';
    params.push(roomId);
  }
  if (projectId) {
    sql += ' AND project_id = ?';
    params.push(projectId);
  }
  if (itemId) {
    sql += ' AND item_id = ?';
    params.push(itemId);
  }

  sql += ' ORDER BY created_at DESC';

  const attachments = db.prepare(sql).all(...params);
  res.json(attachments);
});

// POST / - upload file(s)
router.post('/', (req: AuthRequest, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large. Maximum size is 10 MB.'
        : err.message ?? 'Upload failed';
      res.status(400).json({ error: msg });
      return;
    }
    next();
  });
}, (req: AuthRequest, res) => {
  const db = getDb();
  const { homeId, roomId, projectId, itemId, fileType, caption, photoCategory } = req.body;

  // Verify ownership of the target entity
  if (homeId && !verifyEntityOwnership('home', homeId, req.userId!)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (roomId && !verifyEntityOwnership('room', roomId, req.userId!)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (projectId && !verifyEntityOwnership('project', projectId, req.userId!)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (itemId && !verifyEntityOwnership('item', itemId, req.userId!)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No files uploaded' });
    return;
  }

  const insert = db.prepare(`
    INSERT INTO attachments (home_id, room_id, project_id, item_id, file_name, stored_name, file_type, mime_type, file_size, caption, photo_category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const attachments: any[] = [];

  const insertAll = db.transaction(() => {
    for (const file of files) {
      const result = insert.run(
        homeId || null,
        roomId || null,
        projectId || null,
        itemId || null,
        file.originalname,
        file.filename,
        fileType || 'document',
        file.mimetype,
        file.size,
        caption || null,
        photoCategory || null,
      );
      const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid);
      attachments.push(attachment);
    }
  });

  insertAll();
  res.status(201).json(attachments);
});

// DELETE /:id - delete attachment and remove file from disk
router.delete('/:id', (req: AuthRequest, res) => {
  const attachment = verifyAttachmentOwnership(req.params.id, req.userId!);
  if (!attachment) {
    res.status(404).json({ error: 'Attachment not found' });
    return;
  }

  // Determine subdirectory based on file_type
  const subdir = attachment.file_type === 'photo' ? 'photos' : 'documents';
  const filePath = path.join(UPLOADS_BASE, subdir, attachment.stored_name);

  // Remove file from disk
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // File may already be gone, continue with DB deletion
  }

  const db = getDb();
  db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Attachment deleted' });
});

export default router;
