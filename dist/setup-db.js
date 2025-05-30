"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database");
const setupDatabase = async () => {
    const db = new database_1.Database('./contacts.db');
    console.log('Database setup complete!');
    console.log('You can now run the service with: npm run dev');
    db.close();
};
if (require.main === module) {
    setupDatabase().catch(console.error);
}
