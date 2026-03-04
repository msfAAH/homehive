import type Database from 'better-sqlite3';

export function migrate001(db: Database.Database): void {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      google_id TEXT UNIQUE,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Add user_id column to homes if not present
  const homeCols = db.pragma('table_info(homes)') as { name: string }[];
  if (homeCols.length > 0 && !homeCols.some((c) => c.name === 'user_id')) {
    // Create a default user for existing data
    const existing = db.prepare('SELECT id FROM users WHERE id = 1').get();
    if (!existing) {
      db.prepare(`
        INSERT INTO users (id, email, first_name, last_name)
        VALUES (1, 'default@homehive.local', 'Default', 'User')
      `).run();
    }

    // Add user_id column with default value for existing rows
    db.exec(`ALTER TABLE homes ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id)`);
  }
}
