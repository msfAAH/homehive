import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const UPLOADS_BASE = path.join(import.meta.dirname, '../../uploads');

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.gif'];
const DOC_EXTS = ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.csv'];

// Ensure upload directories exist
fs.mkdirSync(path.join(UPLOADS_BASE, 'photos'), { recursive: true });
fs.mkdirSync(path.join(UPLOADS_BASE, 'documents'), { recursive: true });
const ALLOWED_EXTS = [...IMAGE_EXTS, ...DOC_EXTS];

const storage = multer.diskStorage({
  destination(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const subdir = IMAGE_EXTS.includes(ext) ? 'photos' : 'documents';
    cb(null, path.join(UPLOADS_BASE, subdir));
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${ext}`));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default upload;
