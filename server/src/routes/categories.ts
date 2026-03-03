import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

// GET / - list all categories
router.get('/', (_req, res) => {
  const db = getDb();
  const categories = db.prepare('SELECT * FROM project_categories ORDER BY name ASC').all();
  res.json(categories);
});

// POST / - create category
router.post('/', (req, res) => {
  const db = getDb();
  const { name } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  try {
    const result = db.prepare('INSERT INTO project_categories (name) VALUES (?)').run(name.trim());
    const category = db.prepare('SELECT * FROM project_categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(category);
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Category already exists' });
      return;
    }
    throw err;
  }
});

export default router;
