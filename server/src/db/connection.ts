import { neon } from '@neondatabase/serverless';

let _sql: ReturnType<typeof neon> | null = null;

export function initDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  _sql = neon(url);
  return _sql;
}

export function getDb() {
  if (!_sql) throw new Error('Database not initialized. Call initDb() first.');
  return _sql;
}
