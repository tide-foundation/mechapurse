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
      expiry TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS cardanoTxAuthorizations (
      id TEXT PRIMARY KEY,
      userId TEXT,
      cardanoTxRequestId TEXT NOT NULL,
      authorization TEXT,
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

  await db.exec(`
    CREATE TABLE IF NOT EXISTS ruleSettingsDraft (
      id TEXT PRIMARY KEY,
      ruleReqDraft TEXT,
      expiry TEXT
    );
  `);
  

  await db.exec(`
    CREATE TABLE IF NOT EXISTS ruleSettingsAuthorization (
      id TEXT PRIMARY KEY,
      userId TEXT,
      ruleSettingsDraftId TEXT NOT NULL,
      authorization TEXT,
      FOREIGN KEY (ruleSettingsDraftId) REFERENCES ruleSettingsDraft(id) ON DELETE CASCADE
    );
  `);

  console.log("SQLite database initialized: 'cardanoTxRequests', 'cardanoTxAuthorizations', and 'ruleSettings' tables are ready.");
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
    'SELECT authorization FROM cardanoTxAuthorizations WHERE cardanoTxRequestId = ?',
    requestId
  );
  return rows;
}

export async function GetDraftSignRequestByUser(requestId: string, userId: string): Promise<AdminAuthorizationPack | null> {
  const db = await dbPromise;
  const rows = await db.all<AdminAuthorizationPack[]>(
    'SELECT authorization FROM cardanoTxAuthorizations WHERE cardanoTxRequestId = ? AND userId = ?',
    requestId,
    userId
  );
  return rows[0] || null;
}

export async function AddDraftSignRequest(txBody: string, draft: string, draftJson: string): Promise<DraftSignRequest> {
  const db = await dbPromise;
  const id = crypto.randomUUID();
  const date = new Date();
  const expiry = (
    Math.floor(date.getTime() / 1000) +
    7 * 24 * 60 * 60
  ).toString(); // 1 week later


  await db.run(
    'INSERT INTO cardanoTxRequests (id, txBody, draft, draftJson, expiry) VALUES (?, ?, ?, ?, ?)',
    id,
    txBody,
    draft,
    draftJson,
    expiry
  );

  return {
    id,
    txBody,
    draft,
    draftJson,
    expiry: expiry
  };
}

export async function AddAuthorization(cardanoTxRequestId: string, userId: string, authorization: string) {
  const db = await dbPromise;
  const id = crypto.randomUUID();
  const existingAuth = await GetDraftSignRequestByUser(cardanoTxRequestId, userId);

  if (existingAuth) {
    return;
  } else {
    await db.run(
      'INSERT INTO cardanoTxAuthorizations (id, userId, cardanoTxRequestId, authorization) VALUES (?, ?, ?, ?)',
      id,
      userId,
      cardanoTxRequestId,
      authorization
    );
  }
}

export async function DeleteDraftSignRequest(id: string) {
  const db = await dbPromise;
  await db.run('DELETE FROM cardanoTxRequests WHERE id = ?', id);
}

export async function DeleteAuthorization(id: string) {
  const db = await dbPromise;
  await db.run('DELETE FROM cardanoTxAuthorizations WHERE id = ?', id);
}

/**
 * Retrieves the current rule settings draft.
 */
export async function GetRuleSettingsDraft(): Promise<[{ id: string; ruleReqDraft: string; expiry: string }] | null> {
  const db = await dbPromise;
  const row = await db.all<[{ id: string; ruleReqDraft: string; expiry: string }] | null>('SELECT * FROM ruleSettingsDraft');
  if (!row) return null;
  return row;
}

export async function GetRuleSettingsDraftById(id: string): Promise<{ id: string; ruleReqDraft: string; expiry: string } | null> {
  const db = await dbPromise;
  const row = await db.get('SELECT * FROM ruleSettingsDraft WHERE id = ?', id);
  if (!row) return null;
  return {
    id: row.id,
    ruleReqDraft: row.ruleReqDraft,
    expiry: row.expiry,
  };
}

export async function AddRuleSettingsDraft(ruleReqDraft: string): Promise<{ id: string; ruleReqDraft: string; expiry: string } | null> {
  const db = await dbPromise;
  const id = crypto.randomUUID();
  const date = new Date();
  const expiry = (
    Math.floor(date.getTime() / 1000) +
    7 * 24 * 60 * 60
  ).toString(); // 1 week later

  await db.run(
    'INSERT INTO ruleSettingsDraft (id, ruleReqDraft, expiry) VALUES (?, ?, ?)',
    id,
    ruleReqDraft,
    expiry
  );
  return await GetRuleSettingsDraftById(id);
}

/**
 * Deletes a rule settings draft by its id.
 */
export async function DeleteRuleSettingsDraft(id: string): Promise<void> {
  const db = await dbPromise;
  await db.run('DELETE FROM ruleSettingsDraft WHERE id = ?', id);
}

/**
 * Retrieves a specific rule settings authorization by its primary id.
 */
export async function GetRuleSettingsAuthorizationById(id: string): Promise<{ id: string; userId: string; ruleSettingsDraftId: string; authorization: string } | null> {
  const db = await dbPromise;
  const row = await db.get('SELECT * FROM ruleSettingsAuthorization WHERE id = ?', id);
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    ruleSettingsDraftId: row.ruleSettingsDraftId,
    authorization: row.authorization,
  };
}

/**
 * Retrieves all rule settings authorizations for a given rule settings draft.
 */
export async function GetRuleSettingsAuthorizationsByDraft(ruleSettingsDraftId: string): Promise<Array<{ id: string; userId: string; authorization: string }>> {
  const db = await dbPromise;
  const rows = await db.all('SELECT id, userId, authorization FROM ruleSettingsAuthorization WHERE ruleSettingsDraftId = ?', ruleSettingsDraftId);
  return rows;
}

/**
 * Creates a new rule settings authorization or updates an existing one for a given draft and user.
 */
export async function AddOrUpdateRuleSettingsAuthorization(ruleSettingsDraftId: string, userId: string, authorization: string): Promise<void> {
  const db = await dbPromise;
  // Check if an authorization for this draft and user already exists.
  const existingAuth = await db.get(
    'SELECT * FROM ruleSettingsAuthorization WHERE ruleSettingsDraftId = ? AND userId = ?',
    ruleSettingsDraftId,
    userId
  );

  if (existingAuth) {
    await db.run(
      'UPDATE ruleSettingsAuthorization SET authorization = ? WHERE ruleSettingsDraftId = ? AND userId = ?',
      authorization,
      ruleSettingsDraftId,
      userId
    );
  } else {
    const id = crypto.randomUUID();
    await db.run(
      'INSERT INTO ruleSettingsAuthorization (id, userId, ruleSettingsDraftId, authorization) VALUES (?, ?, ?, ?)',
      id,
      userId,
      ruleSettingsDraftId,
      authorization
    );
  }
}

/**
 * Deletes a rule settings authorization by its primary id.
 */
export async function DeleteRuleSettingsAuthorization(id: string): Promise<void> {
  const db = await dbPromise;
  await db.run('DELETE FROM ruleSettingsAuthorization WHERE id = ?', id);
}
