import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database;

export function initDb(): Database.Database {
  const dbPath = path.join(import.meta.dirname, '../../homehive.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}
