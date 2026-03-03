import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection.js';
import upload from '../middleware/upload.js';

const router = Router();
const UPLOADS_BASE = path.join(import.meta.dirname, '../../uploads');

// GET / - list attachments filtered by query params
router.get('/', (req, res) => {
  const db = getDb();
  const { homeId, roomId, projectId, itemId } = req.query;

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
router.post('/', (req, res, next) => {
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
}, (req, res) => {
  const db = getDb();
  const { homeId, roomId, projectId, itemId, fileType, caption, photoCategory } = req.body;
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
router.delete('/:id', (req, res) => {
  const db = getDb();
  const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id) as any;

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

  db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Attachment deleted' });
});

export default router;
