import { getDb } from './connection.js';

export async function seed(): Promise<void> {
  const sql = getDb();
  const categories = [
    'Plumbing', 'Electrical', 'HVAC', 'Roofing', 'Painting',
    'Flooring', 'Landscaping', 'Appliances', 'Renovation', 'Maintenance', 'Other',
  ];

  for (const name of categories) {
    await sql`INSERT INTO project_categories (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
  }
}
