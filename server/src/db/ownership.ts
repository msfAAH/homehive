import { getDb } from './connection.js';

export async function verifyHomeOwnership(homeId: string, userId: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`SELECT id FROM homes WHERE id = ${homeId} AND user_id = ${userId}`;
  return rows.length > 0;
}

export async function verifyRoomOwnership(roomId: string, userId: number): Promise<Record<string, any> | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT r.* FROM rooms r
    JOIN homes h ON r.home_id = h.id
    WHERE r.id = ${roomId} AND h.user_id = ${userId}
  `;
  return row ?? null;
}

export async function verifyProjectOwnership(projectId: string, userId: number): Promise<Record<string, any> | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT p.* FROM projects p
    JOIN homes h ON p.home_id = h.id
    WHERE p.id = ${projectId} AND h.user_id = ${userId}
  `;
  return row ?? null;
}
