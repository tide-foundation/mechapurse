import sqlite3 from 'sqlite3';
import { ISqlite, IMigrate, open } from 'sqlite'
import { DraftSignRequest,  AdminAuthorizationPack} from '@/interfaces/interface';

 
// Open (or create) a database file named "database.sqlite"
const dbPromise = open({
  filename: './database.sqlite',
  driver: sqlite3.Database,
});

/**
 * Initializes the database by creating the "users" table if it doesn't exist.
 * The table uses TEXT fields for both "id" and "dob".
 */
async function initializeDatabase() {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cardanoTxRequests (
      id TEXT PRIMARY KEY,
      txBody TEXT,
      draft TEXT,
      draftJson TEXT,
      creationTimestamp TEXT DEFAULT (datetime('now'))

    );
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS adminauth (
      id TEXT PRIMARY KEY,
      userId TEXT,
      cardanoTxRequestId TEXT NOT NULL,
      adminAuthorization TEXT,
      FOREIGN KEY (cardanoTxRequestId) REFERENCES cardanoTxRequests(id) ON DELETE CASCADE
    );
  `);
  
  console.log("SQLite database initialized, 'cardanoTxRequests' and 'adminauth' tables are ready.");
}

// Run the database initialization on startup.
initializeDatabase();

export async function GetAllDraftSignRequests(): Promise<DraftSignRequest[]> {
  const db = await dbPromise;
  const rows = await db.all<DraftSignRequest[]>('SELECT * FROM cardanoTxRequests');
  return rows;
}


export async function GetDraftSignRequest(id: string): Promise<DraftSignRequest | null> {
  const db = await dbPromise;
  const row = await db.get('SELECT draft FROM cardanoTxRequests WHERE id = ?', id);
  return row;
}

export async function GetDraftSignRequestAuthorizations(requestId: string): Promise<AdminAuthorizationPack[]> {
    const db = await dbPromise;
    const rows = await db.all<AdminAuthorizationPack[]>(
      'SELECT adminAuthorization FROM adminauth WHERE cardanoTxRequestId = ?',
      requestId
    );
    return rows; // array of { adminAuthorization: "..." }
}

export async function AddDraftSignRequest(txBody:string, draft: string, draftJson: string): Promise<DraftSignRequest> {
    const db = await dbPromise;
    const id = crypto.randomUUID(); // e.g. '4f3d5e12-1234-4fef-bb6e-b8f94d9e9c3f'
    const now = new Date().toISOString();
    await db.run(
      'INSERT INTO cardanoTxRequests (id, txBody, draft, draftJson, creationTimestamp) VALUES (?, ?, ?, ?, ?)',
      id,
      txBody,
      draft,
      draftJson,
      now
    );

    const row = await db.get('SELECT * FROM cardanoTxRequests WHERE id = ?', id);
    console.log(row)

    return row;
}

  export async function AddAdminAuthorization(cardanoTxRequestId: string, userId: string, adminAuthorization: string) {
    const db = await dbPromise;
    const id = crypto.randomUUID(); // e.g. '4f3d5e12-1234-4fef-bb6e-b8f94d9e9c3f'  

    console.log(cardanoTxRequestId)
    await db.run(
      'INSERT INTO adminauth (id, userId, cardanoTxRequestId, adminAuthorization) VALUES (?, ?, ?, ?)',
      id,
      userId,
      cardanoTxRequestId,
      adminAuthorization
    );
  }

  export async function DeleteDraftSignRequest(id: string) {
    const db = await dbPromise;
    await db.run('DELETE FROM cardanoTxRequests WHERE id = ?', id);
  }
  

  export async function DeleteAdminAuthorization(id: string) {
    const db = await dbPromise;
    await db.run('DELETE FROM adminauth WHERE id = ?', id);
  }
  
  
  