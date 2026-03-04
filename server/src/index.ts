import 'dotenv/config';
import express from 'express';
// cors handled manually below
import path from 'path';
import { initDb } from './db/connection.js';
import { runSchema } from './db/schema.js';
import { seed } from './db/seed.js';
import { authMiddleware } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import homesRouter from './routes/homes.js';
import roomsRouter from './routes/rooms.js';
import categoriesRouter from './routes/categories.js';
import projectsRouter from './routes/projects.js';
import lineItemsRouter from './routes/lineItems.js';
import attachmentsRouter from './routes/attachments.js';
import contractorsRouter from './routes/contractors.js';
import itemsRouter from './routes/items.js';
import extractRouter from './routes/extract.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// CORS: handle preflight manually to guarantee headers are always sent
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || '*';
app.use((_req, res, next) => {
  const origin = _req.headers.origin;
  if (ALLOWED_ORIGIN === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && ALLOWED_ORIGIN.split(',').map(u => u.trim()).includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (_req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(import.meta.dirname, '../uploads')));

// Public routes (no auth required)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});
app.use('/api/auth', authRouter);

// Protected routes (auth required)
app.use('/api/homes', authMiddleware, homesRouter);
app.use('/api/rooms', authMiddleware, roomsRouter);
app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api/projects', authMiddleware, projectsRouter);
app.use('/api/line-items', authMiddleware, lineItemsRouter);
app.use('/api/attachments', authMiddleware, attachmentsRouter);
app.use('/api/contractors', authMiddleware, contractorsRouter);
app.use('/api/items', authMiddleware, itemsRouter);
app.use('/api/extract', authMiddleware, extractRouter);

// Initialize database and start server
const db = initDb();
runSchema(db);
seed(db);

app.listen(PORT, () => {
  console.log(`HomeHive server running on http://localhost:${PORT}`);
});
