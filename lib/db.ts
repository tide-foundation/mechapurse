import sqlite3 from 'sqlite3';
import { ISqlite, IMigrate, open } from 'sqlite';
import { DraftSignRequest, AdminAuthorizationPack, RuleConfiguration } from '@/interfaces/interface';

// Open (or create) a database file named "database.sqlite"
const dbPromise = open({
  filename: './database.sqlite',
  driver: sqlite3.Database,
});

/**
 * Initializes the database by creating necessary tables if they don't exist.
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

  await db.exec(`
    CREATE TABLE IF NOT EXISTS ruleSettings (
      id TEXT PRIMARY KEY,
      rules TEXT,
      rulesCert TEXT
    );
  `);

  console.log("SQLite database initialized: 'cardanoTxRequests', 'adminauth', and 'ruleSettings' tables are ready.");
}

initializeDatabase().catch((err) => {
  console.error("Failed to initialize database:", err);
});

export { dbPromise, initializeDatabase };

export async function GetRuleConfiguration(): Promise<RuleConfiguration | null> {
  const db = await dbPromise;
  const row = await db.get('SELECT * FROM ruleSettings');

  if (!row) return null;

  return {
    id: row.id,
    ruleConfig: {
      rules: JSON.parse(row.rules),
      rulesCert: row.rulesCert
    }
  };
}


export async function AddRuleConfiguration(ruleConfig: string, ruleConfigCert: string): Promise<void> {
  const db = await dbPromise;
  const id = crypto.randomUUID();
  const existingRule = await GetRuleConfiguration();

  if (existingRule && existingRule.id) {
    await db.run(
      'UPDATE ruleSettings SET rules = ?, rulesCert = ? WHERE id = ?',
      ruleConfig,
      ruleConfigCert,
      existingRule.id
    );
  } else {
    await db.run(
      'INSERT INTO ruleSettings (id, rules, rulesCert) VALUES (?, ?, ?)',
      id,
      ruleConfig,
      ruleConfigCert
    );
  }
}

export async function GetAllDraftSignRequests(): Promise<DraftSignRequest[]> {
  const db = await dbPromise;
  const rows = await db.all<DraftSignRequest[]>('SELECT * FROM cardanoTxRequests');
  return rows;
}

export async function GetDraftSignRequest(id: string): Promise<DraftSignRequest | null> {
  const db = await dbPromise;
  const row = await db.get<DraftSignRequest>('SELECT draft FROM cardanoTxRequests WHERE id = ?', id);
  return row || null;
}

export async function GetDraftSignRequestAuthorizations(requestId: string): Promise<AdminAuthorizationPack[]> {
  const db = await dbPromise;
  const rows = await db.all<AdminAuthorizationPack[]>(
    'SELECT adminAuthorization FROM adminauth WHERE cardanoTxRequestId = ?',
    requestId
  );
  return rows;
}

export async function GetDraftSignRequestByUser(requestId: string, userId: string): Promise<AdminAuthorizationPack | null> {
  const db = await dbPromise;
  const rows = await db.all<AdminAuthorizationPack[]>(
    'SELECT adminAuthorization FROM adminauth WHERE cardanoTxRequestId = ? AND userId = ?',
    requestId,
    userId
  );
  return rows[0] || null;
}

export async function AddDraftSignRequest(txBody: string, draft: string, draftJson: string): Promise<DraftSignRequest> {
  const db = await dbPromise;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.run(
    'INSERT INTO cardanoTxRequests (id, txBody, draft, draftJson, creationTimestamp) VALUES (?, ?, ?, ?, ?)',
    id,
    txBody,
    draft,
    draftJson,
    now
  );

  return {
    id,
    txBody,
    draft,
    draftJson,
    creationTimestamp: now
  };
}

export async function AddAdminAuthorization(cardanoTxRequestId: string, userId: string, adminAuthorization: string) {
  const db = await dbPromise;
  const id = crypto.randomUUID();
  const existingAuth = await GetDraftSignRequestByUser(cardanoTxRequestId, userId);

  if (existingAuth) {
    await db.run(
      'UPDATE adminauth SET adminAuthorization = ? WHERE cardanoTxRequestId = ? AND userId = ?',
      adminAuthorization,
      cardanoTxRequestId,
      userId
    );
  } else {
    await db.run(
      'INSERT INTO adminauth (id, userId, cardanoTxRequestId, adminAuthorization) VALUES (?, ?, ?, ?)',
      id,
      userId,
      cardanoTxRequestId,
      adminAuthorization
    );
  }
}

export async function DeleteDraftSignRequest(id: string) {
  const db = await dbPromise;
  await db.run('DELETE FROM cardanoTxRequests WHERE id = ?', id);
}

export async function DeleteAdminAuthorization(id: string) {
  const db = await dbPromise;
  await db.run('DELETE FROM adminauth WHERE id = ?', id);
}
