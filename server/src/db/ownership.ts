import { getDb } from './connection.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// ── Homes ─────────────────────────────────────────────────────────────────────

export async function verifyHomeOwnership(homeId: string | number, userId: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`SELECT id FROM homes WHERE id = ${homeId} AND user_id = ${userId}`;
  return rows.length > 0;
}

// ── Rooms ─────────────────────────────────────────────────────────────────────
// Rooms are always scoped to a home — ownership is verified via the home's user_id.

export async function verifyRoomOwnership(roomId: string | number, userId: number): Promise<Row | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT r.* FROM rooms r
    JOIN homes h ON r.home_id = h.id
    WHERE r.id = ${roomId} AND h.user_id = ${userId}
  `;
  return row ?? null;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function verifyProjectOwnership(projectId: string | number, userId: number): Promise<Row | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT p.* FROM projects p
    JOIN homes h ON p.home_id = h.id
    WHERE p.id = ${projectId} AND h.user_id = ${userId}
  `;
  return row ?? null;
}

// ── Items ─────────────────────────────────────────────────────────────────────
// Items belong to rooms which belong to homes.

export async function verifyItemOwnership(itemId: string | number, userId: number): Promise<Row | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT i.* FROM items i
    JOIN rooms r ON i.room_id = r.id
    JOIN homes h ON r.home_id = h.id
    WHERE i.id = ${itemId} AND h.user_id = ${userId}
  `;
  return row ?? null;
}

// ── Contractors ───────────────────────────────────────────────────────────────
// Contractors belong to projects which belong to homes.

export async function verifyContractorOwnership(contractorId: string | number, userId: number): Promise<Row | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT c.* FROM contractors c
    JOIN projects p ON c.project_id = p.id
    JOIN homes h ON p.home_id = h.id
    WHERE c.id = ${contractorId} AND h.user_id = ${userId}
  `;
  return row ?? null;
}

// ── Line Items ────────────────────────────────────────────────────────────────
// Line items belong to projects which belong to homes.

export async function verifyLineItemOwnership(lineItemId: string | number, userId: number): Promise<Row | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT li.* FROM line_items li
    JOIN projects p ON li.project_id = p.id
    JOIN homes h ON p.home_id = h.id
    WHERE li.id = ${lineItemId} AND h.user_id = ${userId}
  `;
  return row ?? null;
}

// ── Attachments ───────────────────────────────────────────────────────────────
// Attachments can link to a home, room, project, or item.
// The attachment is owned by the user if any of its linked entities belongs to them.

export async function verifyAttachmentOwnership(attachmentId: string | number, userId: number): Promise<Row | null> {
  const sql = getDb();
  const [att] = await sql`SELECT * FROM attachments WHERE id = ${attachmentId}`;
  if (!att) return null;

  if (att.home_id) {
    const rows = await sql`SELECT id FROM homes WHERE id = ${att.home_id} AND user_id = ${userId}`;
    if (rows.length > 0) return att;
  }
  if (att.room_id) {
    const rows = await sql`
      SELECT r.id FROM rooms r JOIN homes h ON r.home_id = h.id
      WHERE r.id = ${att.room_id} AND h.user_id = ${userId}
    `;
    if (rows.length > 0) return att;
  }
  if (att.project_id) {
    const rows = await sql`
      SELECT p.id FROM projects p JOIN homes h ON p.home_id = h.id
      WHERE p.id = ${att.project_id} AND h.user_id = ${userId}
    `;
    if (rows.length > 0) return att;
  }
  if (att.item_id) {
    const rows = await sql`
      SELECT i.id FROM items i
      JOIN rooms r ON i.room_id = r.id
      JOIN homes h ON r.home_id = h.id
      WHERE i.id = ${att.item_id} AND h.user_id = ${userId}
    `;
    if (rows.length > 0) return att;
  }

  return null;
}
