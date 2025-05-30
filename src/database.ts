import sqlite3 from 'sqlite3';
import { Contact } from './types';

export class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new sqlite3.Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS Contact (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phoneNumber TEXT,
        email TEXT,
        linkedId INTEGER,
        linkPrecedence TEXT CHECK(linkPrecedence IN ('primary', 'secondary')) NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        deletedAt DATETIME,
        FOREIGN KEY (linkedId) REFERENCES Contact(id)
      )
    `;
    
    this.db.run(createTableSQL, (err) => {
      if (err) {
        console.error('Error creating Contact table:', err);
      } else {
        console.log('Contact table created successfully');
      }
    });
  }

  async findContactsByEmailOrPhone(email?: string, phoneNumber?: string): Promise<Contact[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM Contact WHERE deletedAt IS NULL AND (';
      const params: string[] = [];
      
      if (email) {
        query += 'email = ?';
        params.push(email);
      }
      
      if (phoneNumber) {
        if (email) query += ' OR ';
        query += 'phoneNumber = ?';
        params.push(phoneNumber);
      }
      
      query += ')';
      
      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const contacts = rows.map(row => ({
            ...row,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
            deletedAt: row.deletedAt ? new Date(row.deletedAt) : undefined
          }));
          resolve(contacts);
        }
      });
    });
  }

  async getAllLinkedContacts(primaryId: number): Promise<Contact[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM Contact 
        WHERE deletedAt IS NULL AND (
          id = ? OR 
          linkedId = ? OR 
          linkedId IN (SELECT id FROM Contact WHERE linkedId = ? AND deletedAt IS NULL)
        )
        ORDER BY createdAt ASC
      `;
      
      this.db.all(query, [primaryId, primaryId, primaryId], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const contacts = rows.map(row => ({
            ...row,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
            deletedAt: row.deletedAt ? new Date(row.deletedAt) : undefined
          }));
          resolve(contacts);
        }
      });
    });
  }

  async createContact(contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(
        query,
        [contact.phoneNumber || null, contact.email || null, contact.linkedId || null, contact.linkPrecedence],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Fetch the created contact
            const selectQuery = 'SELECT * FROM Contact WHERE id = ?';
            this.get(selectQuery, [this.lastID], (err: any, row: any) => {
              if (err) {
                reject(err);
              } else {
                const newContact: Contact = {
                  ...row,
                  createdAt: new Date(row.createdAt),
                  updatedAt: new Date(row.updatedAt),
                  deletedAt: row.deletedAt ? new Date(row.deletedAt) : undefined
                };
                resolve(newContact);
              }
            });
          }
        }
      );
    });
  }

  async updateContact(id: number, updates: Partial<Contact>): Promise<void> {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      if (updates.linkedId !== undefined) {
        fields.push('linkedId = ?');
        values.push(updates.linkedId);
      }
      
      if (updates.linkPrecedence) {
        fields.push('linkPrecedence = ?');
        values.push(updates.linkPrecedence);
      }
      
      fields.push('updatedAt = CURRENT_TIMESTAMP');
      values.push(id);
      
      const query = `UPDATE Contact SET ${fields.join(', ')} WHERE id = ?`;
      
      this.db.run(query, values, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  close(): void {
    this.db.close();
  }
}
