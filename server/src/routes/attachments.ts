import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection.js';
import upload from '../middleware/upload.js';
import { wrap } from '../middleware/asyncWrap.js';
import { verifyHomeOwnership, verifyRoomOwnership, verifyProjectOwnership, verifyItemOwnership, verifyAttachmentOwnership } from '../db/ownership.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();
const UPLOADS_BASE = path.join(import.meta.dirname, '../../uploads');

// GET / - list attachments filtered by query params
router.get('/', wrap(async (req, res) => {
  const { homeId, roomId, projectId, itemId } = req.query;

  if (homeId && !await verifyHomeOwnership(homeId as string, req.userId!)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  if (roomId && !await verifyRoomOwnership(roomId as string, req.userId!)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  if (projectId && !await verifyProjectOwnership(projectId as string, req.userId!)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  if (itemId && !await verifyItemOwnership(itemId as string, req.userId!)) {
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
}));

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
}, wrap(async (req, res) => {
  const { homeId, roomId, projectId, itemId, fileType, caption, photoCategory } = req.body;

  if (homeId && !await verifyHomeOwnership(homeId, req.userId!)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  if (roomId && !await verifyRoomOwnership(roomId, req.userId!)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  if (projectId && !await verifyProjectOwnership(projectId, req.userId!)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  if (itemId && !await verifyItemOwnership(itemId, req.userId!)) {
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
}));

// DELETE /:id - delete attachment and remove file from disk
router.delete('/:id', wrap(async (req, res) => {
  const attachment = await verifyAttachmentOwnership(req.params.id, req.userId!);
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
}));

export default router;
