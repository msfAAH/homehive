import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './db/connection.js';
import { runSchema } from './db/schema.js';
import { seed } from './db/seed.js';
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
  ? [process.env.FRONTEND_URL]
  : undefined;
app.use(cors(allowedOrigins ? { origin: allowedOrigins } : undefined));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(import.meta.dirname, '../uploads')));

// API routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/homes', homesRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/line-items', lineItemsRouter);
app.use('/api/attachments', attachmentsRouter);
app.use('/api/contractors', contractorsRouter);
app.use('/api/items', itemsRouter);
app.use('/api/extract', extractRouter);

// Initialize database and start server
const db = initDb();
runSchema(db);
seed(db);

app.listen(PORT, () => {
  console.log(`HomeHive server running on http://localhost:${PORT}`);
});
