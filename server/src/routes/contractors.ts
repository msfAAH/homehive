import { Router } from 'express';
import { getDb } from '../db/connection.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper: verify home belongs to user
function verifyHomeOwnership(homeId: string, userId: number): boolean {
  const db = getDb();
  return !!db.prepare('SELECT id FROM homes WHERE id = ? AND user_id = ?').get(homeId, userId);
}

// Helper: verify project belongs to user
function verifyProjectOwnership(projectId: string, userId: number): boolean {
  const db = getDb();
  return !!db.prepare(`
    SELECT p.id FROM projects p
    JOIN homes h ON p.home_id = h.id
    WHERE p.id = ? AND h.user_id = ?
  `).get(projectId, userId);
}

// Helper: verify contractor belongs to user (through project -> home)
function verifyContractorOwnership(contractorId: string, userId: number): any {
  const db = getDb();
  return db.prepare(`
    SELECT c.* FROM contractors c
    JOIN projects p ON c.project_id = p.id
    JOIN homes h ON p.home_id = h.id
    WHERE c.id = ? AND h.user_id = ?
  `).get(contractorId, userId);
}

// GET /home/:homeId - list all contractors for a home (across all its projects)
router.get('/home/:homeId', (req: AuthRequest, res) => {
  if (!verifyHomeOwnership(req.params.homeId as string, req.userId!)) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  const db = getDb();
  const contractors = db
    .prepare(
      `SELECT c.*, p.name AS project_name, p.id AS project_id
       FROM contractors c
       JOIN projects p ON c.project_id = p.id
       WHERE p.home_id = ?
       ORDER BY p.name ASC, c.company_name ASC`
    )
    .all(req.params.homeId as string);
  res.json(contractors);
});

// GET /project/:projectId - list contractors for a project
router.get('/project/:projectId', (req: AuthRequest, res) => {
  if (!verifyProjectOwnership(req.params.projectId as string, req.userId!)) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const db = getDb();
  const contractors = db
    .prepare('SELECT * FROM contractors WHERE project_id = ? ORDER BY created_at ASC')
    .all(req.params.projectId as string);
  res.json(contractors);
});

// POST /project/:projectId - add contractor
router.post('/project/:projectId', (req: AuthRequest, res) => {
  if (!verifyProjectOwnership(req.params.projectId as string, req.userId!)) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const db = getDb();
  const { company_name, contractor_type, contact_name, phone, email, website } = req.body;

  if (!company_name || !company_name.trim()) {
    res.status(400).json({ error: 'Company name is required' });
    return;
  }

  const result = db
    .prepare(
      `INSERT INTO contractors (project_id, company_name, contractor_type, contact_name, phone, email, website)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.params.projectId as string,
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
router.put('/:id', (req: AuthRequest, res) => {
  const existing = verifyContractorOwnership(req.params.id as string, req.userId!) as any;
  if (!existing) {
    res.status(404).json({ error: 'Contractor not found' });
    return;
  }

  const db = getDb();
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
    req.params.id as string,
  );

  const contractor = db.prepare('SELECT * FROM contractors WHERE id = ?').get(req.params.id as string);
  res.json(contractor);
});

// DELETE /:id - delete contractor
router.delete('/:id', (req: AuthRequest, res) => {
  if (!verifyContractorOwnership(req.params.id as string, req.userId!)) {
    res.status(404).json({ error: 'Contractor not found' });
    return;
  }

  const db = getDb();
  db.prepare('DELETE FROM contractors WHERE id = ?').run(req.params.id as string);
  res.json({ message: 'Contractor deleted' });
});

export default router;
