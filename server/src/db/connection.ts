import { neon } from '@neondatabase/serverless';

type SqlTag = (strings: TemplateStringsArray, ...values: any[]) => Promise<any[]>;

let _sql: SqlTag | null = null;

export function initDb(): SqlTag {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  _sql = neon(url) as unknown as SqlTag;
  return _sql;
}

export function getDb(): SqlTag {
  if (!_sql) throw new Error('Database not initialized. Call initDb() first.');
  return _sql;
}
