import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
  : undefined;
app.use(cors({
  origin: allowedOrigins || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
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
