import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { wrapPublic as wrap } from '../middleware/asyncWrap.js';

const router = Router();

// GET / - list all categories
router.get('/', wrap(async (_req, res) => {
  const sql = getDb();
  const categories = await sql`SELECT * FROM project_categories ORDER BY name ASC`;
  res.json(categories);
}));

// POST / - create category
router.post('/', wrap(async (req, res) => {
  const sql = getDb();
  const { name } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  try {
    const [category] = await sql`
      INSERT INTO project_categories (name) VALUES (${name.trim()}) RETURNING *
    `;
    res.status(201).json(category);
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
      res.status(409).json({ error: 'Category already exists' });
      return;
    }
    throw err;
  }
}));

export default router;
