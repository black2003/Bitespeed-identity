import { Database } from './database';

const setupDatabase = async () => {
  const db = new Database('./contacts.db');
  
  console.log('Database setup complete!');
  console.log('You can now run the service with: npm run dev');
  
  db.close();
};

if (require.main === module) {
  setupDatabase().catch(console.error);
}