import { getDb } from './connection.js';

export async function runSchema(): Promise<void> {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      google_id TEXT UNIQUE,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS homes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      address TEXT,
      year_built INTEGER,
      year_bought INTEGER,
      notes TEXT,
      cover_photo TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      home_id INTEGER NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT,
      floor TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS project_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      home_id INTEGER NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
      category_id INTEGER REFERENCES project_categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'planned',
      year_created INTEGER,
      estimated_cost NUMERIC DEFAULT 0,
      actual_cost NUMERIC DEFAULT 0,
      warranty_info TEXT,
      maintenance_info TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS line_items (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity NUMERIC DEFAULT 1,
      unit_cost NUMERIC DEFAULT 0,
      total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
      vendor TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS contractors (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      contractor_type TEXT,
      contact_name TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT,
      brand TEXT,
      model TEXT,
      serial_number TEXT,
      purchase_date TEXT,
      purchase_price NUMERIC,
      warranty_expiry TEXT,
      notes TEXT,
      warranty_info TEXT,
      maintenance_info TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS attachments (
      id SERIAL PRIMARY KEY,
      home_id INTEGER REFERENCES homes(id) ON DELETE CASCADE,
      room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,
      caption TEXT,
      photo_category TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}
