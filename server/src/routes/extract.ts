import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { PDFParse, VerbosityLevel } from 'pdf-parse';
import { getDb } from '../db/connection.js';
import { wrap } from '../middleware/asyncWrap.js';
import { verifyProjectOwnership } from '../db/ownership.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

const UPLOADS_BASE = path.join(import.meta.dirname, '../../uploads');

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === 'your-api-key-here') {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to server/.env');
  }
  return new Anthropic({ apiKey: key });
}

type ContentBlock = Anthropic.ImageBlockParam | Anthropic.TextBlockParam;

async function buildContentBlocks(attachments: Record<string, unknown>[]): Promise<ContentBlock[]> {
  const blocks: ContentBlock[] = [];

  for (const att of attachments) {
    const subdir = att.file_type === 'photo' ? 'photos' : 'documents';
    const filePath = path.join(UPLOADS_BASE, subdir, att.stored_name as string);

    if (!fs.existsSync(filePath)) continue;

    const mime: string = (att.mime_type as string) ?? '';

    if (att.file_type === 'photo' && mime.startsWith('image/')) {
      const data = fs.readFileSync(filePath).toString('base64');
      const mediaType = mime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      blocks.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } });
      blocks.push({ type: 'text', text: `[Image file: ${att.file_name}]` });
    } else if (mime === 'application/pdf' || (att.stored_name as string)?.toLowerCase().endsWith('.pdf')) {
      try {
        const buffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: VerbosityLevel.ERRORS });
        const result = await parser.getText();
        const text = result.text?.slice(0, 8000) ?? '';
        if (text.trim()) blocks.push({ type: 'text', text: `[PDF: ${att.file_name}]\n${text}` });
        await parser.destroy();
      } catch { /* skip unreadable PDFs */ }
    } else {
      try {
        const text = fs.readFileSync(filePath, 'utf-8').slice(0, 8000);
        if (text.trim()) blocks.push({ type: 'text', text: `[Document: ${att.file_name}]\n${text}` });
      } catch { /* skip unreadable files */ }
    }
  }

  return blocks;
}

const EXTRACT_PROMPT = `You are a home management assistant. Based on the attached documents and images, extract relevant warranty and maintenance information.

Please provide two sections:

**WARRANTY INFORMATION**
Summarize any warranty coverage details: what is covered, duration/expiry dates, manufacturer or provider, and how to make a claim. If no warranty info is found, say "No warranty information found in attachments."

**MAINTENANCE SCHEDULE**
Summarize any recommended maintenance tasks, intervals, or service requirements. Include seasonal or periodic tasks if mentioned. If no maintenance schedule is found, say "No maintenance schedule found in attachments."

Be concise and practical. Use bullet points where helpful.`;

async function verifyItemOwnership(itemId: string, userId: number): Promise<Record<string, unknown> | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT i.* FROM items i
    JOIN rooms r ON i.room_id = r.id
    JOIN homes h ON r.home_id = h.id
    WHERE i.id = ${itemId} AND h.user_id = ${userId}
  `;
  return row ?? null;
}

function parseExtractResponse(responseText: string): { warrantyInfo: string; maintenanceInfo: string } {
  const warrantyMatch = responseText.match(/\*\*WARRANTY INFORMATION\*\*\s*([\s\S]*?)(?=\*\*MAINTENANCE SCHEDULE\*\*|$)/i);
  const maintenanceMatch = responseText.match(/\*\*MAINTENANCE SCHEDULE\*\*\s*([\s\S]*?)$/i);
  return {
    warrantyInfo: warrantyMatch ? warrantyMatch[1].trim() : responseText,
    maintenanceInfo: maintenanceMatch ? maintenanceMatch[1].trim() : '',
  };
}

// POST /extract/item/:id
router.post('/item/:id', wrap(async (req, res) => {
  const sql = getDb();
  const item = await verifyItemOwnership(req.params.id, req.userId!);
  if (!item) { res.status(404).json({ error: 'Item not found' }); return; }

  const attachments = await sql`SELECT * FROM attachments WHERE item_id = ${req.params.id}`;
  if (attachments.length === 0) {
    res.status(400).json({ error: 'No attachments found for this item. Upload manuals, warranties, or photos first.' });
    return;
  }

  try {
    const client = getClient();
    const contentBlocks = await buildContentBlocks(attachments as Record<string, unknown>[]);
    if (contentBlocks.length === 0) { res.status(400).json({ error: 'Could not read any attachment content.' }); return; }

    contentBlocks.push({ type: 'text', text: EXTRACT_PROMPT });

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: contentBlocks }],
    });

    const responseText = message.content.filter((b) => b.type === 'text').map((b) => (b as Anthropic.TextBlock).text).join('\n');
    const { warrantyInfo, maintenanceInfo } = parseExtractResponse(responseText);

    await sql`UPDATE items SET warranty_info = ${warrantyInfo}, maintenance_info = ${maintenanceInfo}, updated_at = NOW() WHERE id = ${req.params.id}`;
    const [updated] = await sql`SELECT * FROM items WHERE id = ${req.params.id}`;
    res.json(updated);
  } catch (err: unknown) {
    console.error('Extract error:', err);
    const message = err instanceof Error ? err.message : 'Extraction failed';
    res.status(500).json({ error: message });
  }
}));

// POST /extract/project/:id
router.post('/project/:id', wrap(async (req, res) => {
  const sql = getDb();
  const project = await verifyProjectOwnership(req.params.id, req.userId!);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const attachments = await sql`SELECT * FROM attachments WHERE project_id = ${req.params.id}`;
  if (attachments.length === 0) {
    res.status(400).json({ error: 'No attachments found for this project. Upload contracts, warranties, or photos first.' });
    return;
  }

  try {
    const client = getClient();
    const contentBlocks = await buildContentBlocks(attachments as Record<string, unknown>[]);
    if (contentBlocks.length === 0) { res.status(400).json({ error: 'Could not read any attachment content.' }); return; }

    contentBlocks.push({ type: 'text', text: EXTRACT_PROMPT });

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: contentBlocks }],
    });

    const responseText = message.content.filter((b) => b.type === 'text').map((b) => (b as Anthropic.TextBlock).text).join('\n');
    const { warrantyInfo, maintenanceInfo } = parseExtractResponse(responseText);

    await sql`UPDATE projects SET warranty_info = ${warrantyInfo}, maintenance_info = ${maintenanceInfo}, updated_at = NOW() WHERE id = ${req.params.id}`;
    const [updated] = await sql`SELECT * FROM projects WHERE id = ${req.params.id}`;
    res.json(updated);
  } catch (err: unknown) {
    console.error('Extract error:', err);
    const message = err instanceof Error ? err.message : 'Extraction failed';
    res.status(500).json({ error: message });
  }
}));

// DELETE /extract/item/:id - clear extracted info
router.delete('/item/:id', wrap(async (req, res) => {
  if (!await verifyItemOwnership(req.params.id, req.userId!)) {
    res.status(404).json({ error: 'Item not found' }); return;
  }
  const sql = getDb();
  await sql`UPDATE items SET warranty_info = NULL, maintenance_info = NULL, updated_at = NOW() WHERE id = ${req.params.id}`;
  res.json({ message: 'Cleared' });
}));

// DELETE /extract/project/:id - clear extracted info
router.delete('/project/:id', wrap(async (req, res) => {
  if (!await verifyProjectOwnership(req.params.id, req.userId!)) {
    res.status(404).json({ error: 'Project not found' }); return;
  }
  const sql = getDb();
  await sql`UPDATE projects SET warranty_info = NULL, maintenance_info = NULL, updated_at = NOW() WHERE id = ${req.params.id}`;
  res.json({ message: 'Cleared' });
}));

export default router;
