import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { wrap } from '../middleware/asyncWrap.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

async function verifyHomeOwnership(homeId: string, userId: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`SELECT id FROM homes WHERE id = ${Number(homeId)} AND user_id = ${userId}`;
  return rows.length > 0;
}

async function verifyProjectOwnership(projectId: string, userId: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    SELECT p.id FROM projects p
    JOIN homes h ON p.home_id = h.id
    WHERE p.id = ${Number(projectId)} AND h.user_id = ${userId}
  `;
  return rows.length > 0;
}

async function verifyContractorOwnership(contractorId: string, userId: number): Promise<any> {
  const sql = getDb();
  const [row] = await sql`
    SELECT c.* FROM contractors c
    JOIN projects p ON c.project_id = p.id
    JOIN homes h ON p.home_id = h.id
    WHERE c.id = ${Number(contractorId)} AND h.user_id = ${userId}
  `;
  return row ?? null;
}

// GET /home/:homeId - list all contractors for a home (across all its projects)
router.get('/home/:homeId', wrap(async (req, res) => {
  if (!await verifyHomeOwnership(req.params.homeId as string, req.userId!)) {
    res.status(404).json({ error: 'Home not found' });
    return;
  }

  const sql = getDb();
  const contractors = await sql`
    SELECT c.*, p.name AS project_name, p.id AS project_id
    FROM contractors c
    JOIN projects p ON c.project_id = p.id
    WHERE p.home_id = ${Number(req.params.homeId)}
    ORDER BY p.name ASC, c.company_name ASC
  `;
  res.json(contractors);
}));

// GET /project/:projectId - list contractors for a project
router.get('/project/:projectId', wrap(async (req, res) => {
  if (!await verifyProjectOwnership(req.params.projectId as string, req.userId!)) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const sql = getDb();
  const contractors = await sql`SELECT * FROM contractors WHERE project_id = ${Number(req.params.projectId)} ORDER BY created_at ASC`;
  res.json(contractors);
}));

// POST /project/:projectId - add contractor
router.post('/project/:projectId', wrap(async (req, res) => {
  if (!await verifyProjectOwnership(req.params.projectId as string, req.userId!)) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const sql = getDb();
  const { company_name, contractor_type, contact_name, phone, email, website } = req.body;

  if (!company_name || !company_name.trim()) {
    res.status(400).json({ error: 'Company name is required' });
    return;
  }

  const [contractor] = await sql`
    INSERT INTO contractors (project_id, company_name, contractor_type, contact_name, phone, email, website)
    VALUES (${Number(req.params.projectId)}, ${company_name.trim()}, ${contractor_type?.trim() || null}, ${contact_name?.trim() || null}, ${phone?.trim() || null}, ${email?.trim() || null}, ${website?.trim() || null})
    RETURNING *
  `;
  res.status(201).json(contractor);
}));

// PUT /:id - update contractor
router.put('/:id', wrap(async (req, res) => {
  const existing = await verifyContractorOwnership(req.params.id as string, req.userId!);
  if (!existing) {
    res.status(404).json({ error: 'Contractor not found' });
    return;
  }

  const sql = getDb();
  const { company_name, contractor_type, contact_name, phone, email, website } = req.body;

  await sql`
    UPDATE contractors SET
      company_name = ${company_name?.trim() ?? existing.company_name},
      contractor_type = ${contractor_type !== undefined ? (contractor_type?.trim() || null) : existing.contractor_type},
      contact_name = ${contact_name !== undefined ? (contact_name?.trim() || null) : existing.contact_name},
      phone = ${phone !== undefined ? (phone?.trim() || null) : existing.phone},
      email = ${email !== undefined ? (email?.trim() || null) : existing.email},
      website = ${website !== undefined ? (website?.trim() || null) : existing.website},
      updated_at = NOW()
    WHERE id = ${req.params.id}
  `;

  const [contractor] = await sql`SELECT * FROM contractors WHERE id = ${req.params.id}`;
  res.json(contractor);
}));

// DELETE /:id - delete contractor
router.delete('/:id', wrap(async (req, res) => {
  if (!await verifyContractorOwnership(req.params.id as string, req.userId!)) {
    res.status(404).json({ error: 'Contractor not found' });
    return;
  }

  const sql = getDb();
  await sql`DELETE FROM contractors WHERE id = ${req.params.id}`;
  res.json({ message: 'Contractor deleted' });
}));

export default router;
