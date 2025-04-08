import sqlite3 from 'sqlite3';
import { ISqlite, IMigrate, open } from 'sqlite';
import { DraftSignRequest, AdminAuthorizationPack, RuleConfiguration, RuleSettingDraft, RuleSettingAuthorization } from '@/interfaces/interface';

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
      userId TEXT,
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
      rejected BOOLEAN,
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
      userId TEXT,
      ruleReqDraft TEXT,
      ruleReqDraftJson TEXT,
      expiry TEXT,
      status TEXT DEFAULT 'DRAFT'
    );
  `);
  
  

  await db.exec(`
    CREATE TABLE IF NOT EXISTS ruleSettingsAuthorization (
      id TEXT PRIMARY KEY,
      userId TEXT,
      ruleSettingsDraftId TEXT NOT NULL,
      authorization TEXT,
      rejected BOOLEAN,
      FOREIGN KEY (ruleSettingsDraftId) REFERENCES ruleSettingsDraft(id) ON DELETE CASCADE
    );
  `);

  console.log("SQLite database initialized: 'cardanoTxRequests', 'cardanoTxAuthorizations','ruleSettings' and 'ruleSettingsDraft' tables are ready.");
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

// export const UpdateTxDraftStatusById = async (id: string, newStatus: string) => {
//   const db = await dbPromise;

//   await db.run(
//     `UPDATE cardanoTxRequests
//      SET status = ?
//      WHERE id = ?;`,
//     [newStatus, id]
//   );
// };

export async function AddDraftSignRequest(userId: string,txBody: string, draft: string, draftJson: string): Promise<DraftSignRequest> {
  const db = await dbPromise;
  const id = crypto.randomUUID();
  const date = new Date();
  const expiry = (
    Math.floor(date.getTime() / 1000) +
    7 * 24 * 60 * 60
  ).toString(); // 1 week later


  await db.run(
    'INSERT INTO cardanoTxRequests (id, userId, txBody, draft, draftJson, expiry) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    userId,
    txBody,
    draft,
    draftJson,
    expiry
  );

  return {
    id,
    userId,
    txBody,
    draft,
    draftJson,
    expiry: expiry,
  };
}

export async function AddAuthorization(cardanoTxRequestId: string, userId: string, authorization: string, rejected: boolean) {
  const db = await dbPromise;
  const id = crypto.randomUUID();
  const existingAuth = await GetDraftSignRequestByUser(cardanoTxRequestId, userId);
  const isRejected = rejected ? 1 : 0;

  if (existingAuth) {
    throw new Error(`Authorization already exists for draft ${cardanoTxRequestId} and user ${userId}`);
  } else {
    await db.run(
      'INSERT INTO cardanoTxAuthorizations (id, userId, cardanoTxRequestId, authorization, rejected) VALUES (?, ?, ?, ?, ?)',
      id,
      userId,
      cardanoTxRequestId,
      authorization,
      isRejected
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
export async function GetRuleSettingsDraft(): Promise<[RuleSettingDraft] | null> {
  const db = await dbPromise;
  const row = await db.all<[RuleSettingDraft] | null>('SELECT * FROM ruleSettingsDraft');
  if (!row) return null;
  return row;
}

export async function GetRuleSettingsDraftById(id: string): Promise<RuleSettingDraft | null> {
  const db = await dbPromise;
  const row = await db.get('SELECT * FROM ruleSettingsDraft WHERE id = ?', id);
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    ruleReqDraft: row.ruleReqDraft,
    ruleReqDraftJson: row.ruleReqDraftJson,
    expiry: row.expiry,
    status: row.status

  };
}

export const UpdateRuleSettingDraftStatusById = async (id: string, newStatus: string) => {
  const db = await dbPromise;

  await db.run(
    `UPDATE ruleSettingsDraft
     SET status = ?
     WHERE id = ?;`,
    [newStatus, id]
  );
};

export async function AddRuleSettingsDraft(userId: string,ruleReqDraft: string, ruleReqDraftJson: string): Promise<RuleSettingDraft| null> {
  const db = await dbPromise;
  const id = crypto.randomUUID();
  const date = new Date();
  const expiry = (
    Math.floor(date.getTime() / 1000) +
    7 * 24 * 60 * 60
  ).toString(); // 1 week later

  await db.run(
    'INSERT INTO ruleSettingsDraft (id, userId, ruleReqDraft, ruleReqDraftJson, expiry) VALUES (?, ?, ?, ?, ?)',
    id,
    userId,
    ruleReqDraft,
    ruleReqDraftJson,
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
export async function GetRuleSettingsAuthorizationByDraftId(draftId: string): Promise<RuleSettingAuthorization[] | null> {
  const db = await dbPromise;
  const row = await db.all<RuleSettingAuthorization[]>('SELECT * FROM ruleSettingsAuthorization WHERE ruleSettingsDraftId = ?', draftId);
  if (!row) return null;
  return row;
}

/**
 * Retrieves all rule settings authorizations for a given rule settings draft.
 */
export async function GetRuleSettingsAuthorizationsByDraft(ruleSettingsDraftId: string): Promise<RuleSettingAuthorization[]> {
  const db = await dbPromise;
  const rows = await db.all<RuleSettingAuthorization[]>('SELECT id, userId, authorization FROM ruleSettingsAuthorization WHERE ruleSettingsDraftId = ?', ruleSettingsDraftId);
  return rows;
}

/**
 * Creates a new rule settings authorization or updates an existing one for a given draft and user.
 */
export async function AddRuleSettingsAuthorization(ruleSettingsDraftId: string, userId: string, authorization: string, rejected: boolean): Promise<void> {
  const db = await dbPromise;
  // Check if an authorization for this draft and user already exists.
  const existingAuth = await db.get(
    'SELECT * FROM ruleSettingsAuthorization WHERE ruleSettingsDraftId = ? AND userId = ?',
    ruleSettingsDraftId,
    userId
  );
  const isRejected = rejected ? 1 : 0;

  if (existingAuth) {
    throw new Error(`Authorization already exists for draft ${ruleSettingsDraftId} and user ${userId}`);
  } else {
    const id = crypto.randomUUID();
    await db.run(
      'INSERT INTO ruleSettingsAuthorization (id, userId, ruleSettingsDraftId, authorization, rejected) VALUES (?, ?, ?, ?, ?)',
      id,
      userId,
      ruleSettingsDraftId,
      authorization,
      isRejected
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
