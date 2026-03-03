import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

// GET /home/:homeId - list all contractors for a home (across all its projects)
router.get('/home/:homeId', (req, res) => {
  const db = getDb();
  const contractors = db
    .prepare(
      `SELECT c.*, p.name AS project_name, p.id AS project_id
       FROM contractors c
       JOIN projects p ON c.project_id = p.id
       WHERE p.home_id = ?
       ORDER BY p.name ASC, c.company_name ASC`
    )
    .all(req.params.homeId);
  res.json(contractors);
});

// GET /project/:projectId - list contractors for a project
router.get('/project/:projectId', (req, res) => {
  const db = getDb();
  const contractors = db
    .prepare('SELECT * FROM contractors WHERE project_id = ? ORDER BY created_at ASC')
    .all(req.params.projectId);
  res.json(contractors);
});

// POST /project/:projectId - add contractor
router.post('/project/:projectId', (req, res) => {
  const db = getDb();
  const { company_name, contractor_type, contact_name, phone, email, website } = req.body;

  if (!company_name || !company_name.trim()) {
    res.status(400).json({ error: 'Company name is required' });
    return;
  }

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const result = db
    .prepare(
      `INSERT INTO contractors (project_id, company_name, contractor_type, contact_name, phone, email, website)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.params.projectId,
      company_name.trim(),
      contractor_type?.trim() || null,
      contact_name?.trim() || null,
      phone?.trim() || null,
      email?.trim() || null,
      website?.trim() || null,
    );

  const contractor = db.prepare('SELECT * FROM contractors WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(contractor);
});

// PUT /:id - update contractor
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM contractors WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Contractor not found' });
    return;
  }

  const { company_name, contractor_type, contact_name, phone, email, website } = req.body;

  db.prepare(
    `UPDATE contractors SET
      company_name = ?, contractor_type = ?, contact_name = ?, phone = ?, email = ?, website = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    company_name?.trim() ?? existing.company_name,
    contractor_type !== undefined ? (contractor_type?.trim() || null) : existing.contractor_type,
    contact_name !== undefined ? (contact_name?.trim() || null) : existing.contact_name,
    phone !== undefined ? (phone?.trim() || null) : existing.phone,
    email !== undefined ? (email?.trim() || null) : existing.email,
    website !== undefined ? (website?.trim() || null) : existing.website,
    req.params.id,
  );

  const contractor = db.prepare('SELECT * FROM contractors WHERE id = ?').get(req.params.id);
  res.json(contractor);
});

// DELETE /:id - delete contractor
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM contractors WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Contractor not found' });
    return;
  }

  db.prepare('DELETE FROM contractors WHERE id = ?').run(req.params.id);
  res.json({ message: 'Contractor deleted' });
});

export default router;
