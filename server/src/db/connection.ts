import { neon } from '@neondatabase/serverless';

export type SqlQuery = (strings: TemplateStringsArray, ...values: any[]) => Promise<any[]>;

let _sql: SqlQuery | null = null;

export function initDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  const rawSql = neon(url);
  _sql = (strings: TemplateStringsArray, ...values: any[]) =>
    rawSql(strings, ...values) as unknown as Promise<any[]>;
  return _sql;
}

export function getDb(): SqlQuery {
  if (!_sql) throw new Error('Database not initialized. Call initDb() first.');
  return _sql;
}
