import type Database from 'better-sqlite3';

export function runSchema(db: Database.Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS homes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      year_built INTEGER,
      year_bought INTEGER,
      notes TEXT,
      cover_photo TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_id INTEGER NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT,
      floor TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_id INTEGER NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
      category_id INTEGER REFERENCES project_categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'planned',
      year_created INTEGER,
      estimated_cost REAL DEFAULT 0,
      actual_cost REAL DEFAULT 0,
      warranty_info TEXT,
      maintenance_info TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit_cost REAL DEFAULT 0,
      total_cost REAL GENERATED ALWAYS AS (quantity * unit_cost) STORED,
      vendor TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contractors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      contractor_type TEXT,
      contact_name TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT,
      brand TEXT,
      model TEXT,
      serial_number TEXT,
      purchase_date TEXT,
      purchase_price REAL,
      warranty_expiry TEXT,
      notes TEXT,
      warranty_info TEXT,
      maintenance_info TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_id INTEGER REFERENCES homes(id) ON DELETE CASCADE,
      room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,
      caption TEXT,
      photo_category TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migrations for existing databases
  const roomCols = db.pragma('table_info(rooms)') as { name: string }[];
  if (roomCols.length > 0 && !roomCols.some((c) => c.name === 'icon')) {
    db.exec(`ALTER TABLE rooms ADD COLUMN icon TEXT`);
  }

  const homeCols = db.pragma('table_info(homes)') as { name: string }[];
  if (homeCols.length > 0 && !homeCols.some((c) => c.name === 'cover_photo')) {
    db.exec(`ALTER TABLE homes ADD COLUMN cover_photo TEXT`);
  }

  const contractorCols = db.pragma('table_info(contractors)') as { name: string }[];
  if (contractorCols.length > 0 && !contractorCols.some((c) => c.name === 'contractor_type')) {
    db.exec(`ALTER TABLE contractors ADD COLUMN contractor_type TEXT`);
  }

  const attachmentCols = db.pragma('table_info(attachments)') as { name: string }[];
  if (attachmentCols.length > 0 && !attachmentCols.some((c) => c.name === 'photo_category')) {
    db.exec(`ALTER TABLE attachments ADD COLUMN photo_category TEXT`);
  }
  if (attachmentCols.length > 0 && !attachmentCols.some((c) => c.name === 'item_id')) {
    db.exec(`ALTER TABLE attachments ADD COLUMN item_id INTEGER`);
  }

  const projectCols = db.pragma('table_info(projects)') as { name: string }[];
  if (projectCols.length > 0 && !projectCols.some((c) => c.name === 'warranty_info')) {
    db.exec(`ALTER TABLE projects ADD COLUMN warranty_info TEXT`);
  }
  if (projectCols.length > 0 && !projectCols.some((c) => c.name === 'maintenance_info')) {
    db.exec(`ALTER TABLE projects ADD COLUMN maintenance_info TEXT`);
  }

  const itemCols = db.pragma('table_info(items)') as { name: string }[];
  if (itemCols.length > 0 && !itemCols.some((c) => c.name === 'warranty_info')) {
    db.exec(`ALTER TABLE items ADD COLUMN warranty_info TEXT`);
  }
  if (itemCols.length > 0 && !itemCols.some((c) => c.name === 'maintenance_info')) {
    db.exec(`ALTER TABLE items ADD COLUMN maintenance_info TEXT`);
  }
}
