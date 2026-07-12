import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

console.log('Resetting and seeding database...');
try {
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
    console.log('Existing db.json removed.');
  }
  // Importing db.js triggers the initialization
  await import('./db.js');
  console.log('Database successfully re-seeded with default records.');
} catch (error) {
  console.error('Failed to seed database:', error);
}
