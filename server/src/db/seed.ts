import type Database from 'better-sqlite3';

export function seed(db: Database.Database): void {
  const categories = [
    'Plumbing',
    'Electrical',
    'HVAC',
    'Roofing',
    'Painting',
    'Flooring',
    'Landscaping',
    'Appliances',
    'Renovation',
    'Maintenance',
    'Other',
  ];

  const insert = db.prepare('INSERT OR IGNORE INTO project_categories (name) VALUES (?)');
  const insertMany = db.transaction((cats: string[]) => {
    for (const cat of cats) {
      insert.run(cat);
    }
  });

  insertMany(categories);
}
