import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection.js';
import upload from '../middleware/upload.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();
const UPLOADS_BASE = path.join(import.meta.dirname, '../../uploads');

async function verifyEntityOwnership(entityType: string, entityId: string, userId: number): Promise<boolean> {
  const sql = getDb();
  switch (entityType) {
    case 'home': {
      const rows = await sql`SELECT id FROM homes WHERE id = ${entityId} AND user_id = ${userId}`;
      return rows.length > 0;
    }
    case 'room': {
      const rows = await sql`SELECT r.id FROM rooms r JOIN homes h ON r.home_id = h.id WHERE r.id = ${entityId} AND h.user_id = ${userId}`;
      return rows.length > 0;
    }
    case 'project': {
      const rows = await sql`SELECT p.id FROM projects p JOIN homes h ON p.home_id = h.id WHERE p.id = ${entityId} AND h.user_id = ${userId}`;
      return rows.length > 0;
    }
    case 'item': {
      const rows = await sql`SELECT i.id FROM items i JOIN rooms r ON i.room_id = r.id JOIN homes h ON r.home_id = h.id WHERE i.id = ${entityId} AND h.user_id = ${userId}`;
      return rows.length > 0;
    }
    default:
      return false;
  }
}

async function verifyAttachmentOwnership(attachmentId: string, userId: number): Promise<any> {
  const sql = getDb();
  const [att] = await sql`SELECT * FROM attachments WHERE id = ${attachmentId}`;
  if (!att) return null;

  if (att.home_id && await verifyEntityOwnership('home', String(att.home_id), userId)) return att;
  if (att.room_id && await verifyEntityOwnership('room', String(att.room_id), userId)) return att;
  if (att.project_id && await verifyEntityOwnership('project', String(att.project_id), userId)) return att;
  if (att.item_id && await verifyEntityOwnership('item', String(att.item_id), userId)) return att;

  return null;
}

// GET / - list attachments filtered by query params
router.get('/', async (req: AuthRequest, res) => {
  const { homeId, roomId, projectId, itemId } = req.query;

  if (homeId && !await verifyEntityOwnership('home', homeId as string, req.userId!)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  if (roomId && !await verifyEntityOwnership('room', roomId as string, req.userId!)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  if (projectId && !await verifyEntityOwnership('project', projectId as string, req.userId!)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  if (itemId && !await verifyEntityOwnership('item', itemId as string, req.userId!)) {
    res.status(404).json({ error: 'Not found' }); return;
  }

  const sql = getDb();
  const hId = homeId ? Number(homeId) : null;
  const rId = roomId ? Number(roomId) : null;
  const pId = projectId ? Number(projectId) : null;
  const iId = itemId ? Number(itemId) : null;

  const attachments = await sql`
    SELECT * FROM attachments
    WHERE (${hId} IS NULL OR home_id = ${hId})
      AND (${rId} IS NULL OR room_id = ${rId})
      AND (${pId} IS NULL OR project_id = ${pId})
      AND (${iId} IS NULL OR item_id = ${iId})
    ORDER BY created_at DESC
  `;
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
}, async (req: AuthRequest, res) => {
  const { homeId, roomId, projectId, itemId, fileType, caption, photoCategory } = req.body;

  if (homeId && !await verifyEntityOwnership('home', homeId, req.userId!)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  if (roomId && !await verifyEntityOwnership('room', roomId, req.userId!)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  if (projectId && !await verifyEntityOwnership('project', projectId, req.userId!)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  if (itemId && !await verifyEntityOwnership('item', itemId, req.userId!)) {
    res.status(404).json({ error: 'Not found' }); return;
  }

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No files uploaded' });
    return;
  }

  const sql = getDb();
  const attachments: any[] = [];
  for (const file of files) {
    const [attachment] = await sql`
      INSERT INTO attachments (home_id, room_id, project_id, item_id, file_name, stored_name, file_type, mime_type, file_size, caption, photo_category)
      VALUES (${homeId || null}, ${roomId || null}, ${projectId || null}, ${itemId || null}, ${file.originalname}, ${file.filename}, ${fileType || 'document'}, ${file.mimetype}, ${file.size}, ${caption || null}, ${photoCategory || null})
      RETURNING *
    `;
    attachments.push(attachment);
  }

  res.status(201).json(attachments);
});

// DELETE /:id - delete attachment and remove file from disk
router.delete('/:id', async (req: AuthRequest, res) => {
  const attachment = await verifyAttachmentOwnership(req.params.id as string, req.userId!);
  if (!attachment) {
    res.status(404).json({ error: 'Attachment not found' });
    return;
  }

  const subdir = attachment.file_type === 'photo' ? 'photos' : 'documents';
  const filePath = path.join(UPLOADS_BASE, subdir, attachment.stored_name);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch { /* ignore */ }

  const sql = getDb();
  await sql`DELETE FROM attachments WHERE id = ${req.params.id}`;
  res.json({ message: 'Attachment deleted' });
});

export default router;
