import { neon } from '@neondatabase/serverless';

// Type the sql function with a concrete return type so callers get proper
// array methods (.length, .map, destructuring) without the FullQueryResults union.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlFn = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, any>[]>;

let _sql: SqlFn | null = null;

export function initDb(): SqlFn {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  _sql = neon(url) as unknown as SqlFn;
  return _sql;
}

export function getDb(): SqlFn {
  if (!_sql) throw new Error('Database not initialized. Call initDb() first.');
  return _sql;
}
