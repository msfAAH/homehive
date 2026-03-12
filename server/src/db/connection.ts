import { neon } from '@neondatabase/serverless';

type QueryFn = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>;

let _sql: QueryFn | null = null;

export function initDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  const rawSql = neon(url);
  _sql = (strings: TemplateStringsArray, ...values: unknown[]) =>
    rawSql(strings, ...values) as Promise<Record<string, unknown>[]>;
  return _sql;
}

export function getDb() {
  if (!_sql) throw new Error('Database not initialized. Call initDb() first.');
  return _sql;
}
