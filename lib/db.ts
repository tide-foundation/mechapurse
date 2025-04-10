import Database from 'better-sqlite3';
import {
  DraftSignRequest,
  AdminAuthorizationPack,
  RuleConfiguration,
  RuleSettingDraft,
  RuleSettingAuthorization,
} from '@/interfaces/interface';

const db = new Database('./database.sqlite');
initializeDatabase();

// Row Types

type RuleSettingsRow = {
  id: string;
  rules: string;
  rulesCert: string;
};

type CardanoTxRequestRow = {
  id: string;
  userId: string;
  txBody: string;
  draft: string;
  draftJson: string;
  expiry: string;
};

type CardanoTxAuthorizationRow = {
  id: string;
  userId: string;
  cardanoTxRequestId: string;
  authorization: string;
  rejected: number;
};

type RuleSettingsDraftRow = {
  id: string;
  userId: string;
  ruleReqDraft: string;
  ruleReqDraftJson: string;
  expiry: string;
  status: string;
};

type RuleSettingsAuthorizationRow = {
  id: string;
  userId: string;
  ruleSettingsDraftId: string;
  authorization: string;
  rejected: number;
};

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cardanoTxRequests (
      id TEXT PRIMARY KEY,
      userId TEXT,
      txBody TEXT,
      draft TEXT,
      draftJson TEXT,
      expiry TEXT
    );

    CREATE TABLE IF NOT EXISTS cardanoTxAuthorizations (
      id TEXT PRIMARY KEY,
      userId TEXT,
      cardanoTxRequestId TEXT NOT NULL,
      authorization TEXT,
      rejected BOOLEAN,
      FOREIGN KEY (cardanoTxRequestId) REFERENCES cardanoTxRequests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ruleSettings (
      id TEXT PRIMARY KEY,
      rules TEXT,
      rulesCert TEXT
    );

    CREATE TABLE IF NOT EXISTS ruleSettingsDraft (
      id TEXT PRIMARY KEY,
      userId TEXT,
      ruleReqDraft TEXT,
      ruleReqDraftJson TEXT,
      expiry TEXT,
      status TEXT DEFAULT 'DRAFT'
    );

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

export function GetRuleConfiguration(): RuleConfiguration | null {
  const row = db.prepare('SELECT * FROM ruleSettings').get() as RuleSettingsRow | undefined;
  if (!row) return null;

  return {
    id: row.id,
    ruleConfig: {
      rules: JSON.parse(row.rules),
      rulesCert: row.rulesCert,
    },
  };
}

export function AddRuleConfiguration(ruleConfig: string, ruleConfigCert: string): void {
  const id = crypto.randomUUID();
  const existing = GetRuleConfiguration();

  if (existing?.id) {
    db.prepare('UPDATE ruleSettings SET rules = ?, rulesCert = ? WHERE id = ?').run(ruleConfig, ruleConfigCert, existing.id);
  } else {
    db.prepare('INSERT INTO ruleSettings (id, rules, rulesCert) VALUES (?, ?, ?)').run(id, ruleConfig, ruleConfigCert);
  }
}

export function GetAllDraftSignRequests(): DraftSignRequest[] {
  return db.prepare('SELECT * FROM cardanoTxRequests').all() as DraftSignRequest[];
}

export function GetDraftSignRequest(id: string): DraftSignRequest | null {
  const row = db.prepare('SELECT draft FROM cardanoTxRequests WHERE id = ?').get(id) as DraftSignRequest | undefined;
  return row || null;
}

export function GetDraftSignRequestAuthorizations(requestId: string): AdminAuthorizationPack[] {
  return db.prepare('SELECT authorization FROM cardanoTxAuthorizations WHERE cardanoTxRequestId = ?').all(requestId) as AdminAuthorizationPack[];
}

export function GetDraftSignRequestByUser(requestId: string, userId: string): AdminAuthorizationPack | null {
  const row = db.prepare('SELECT authorization FROM cardanoTxAuthorizations WHERE cardanoTxRequestId = ? AND userId = ?').get(requestId, userId) as AdminAuthorizationPack | undefined;
  return row || null;
}

export function AddDraftSignRequest(userId: string, txBody: string, draft: string, draftJson: string): DraftSignRequest {
  const id = crypto.randomUUID();
  const expiry = (Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60).toString();

  db.prepare('INSERT INTO cardanoTxRequests (id, userId, txBody, draft, draftJson, expiry) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, userId, txBody, draft, draftJson, expiry);

  return { id, userId, txBody, draft, draftJson, expiry };
}

export function AddAuthorization(cardanoTxRequestId: string, userId: string, authorization: string, rejected: boolean): void {
  const existing = GetDraftSignRequestByUser(cardanoTxRequestId, userId);
  if (existing) throw new Error(`Authorization already exists for draft ${cardanoTxRequestId} and user ${userId}`);

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO cardanoTxAuthorizations (id, userId, cardanoTxRequestId, authorization, rejected) VALUES (?, ?, ?, ?, ?)')
    .run(id, userId, cardanoTxRequestId, authorization, rejected ? 1 : 0);
}

export function DeleteDraftSignRequest(id: string): void {
  db.prepare('DELETE FROM cardanoTxRequests WHERE id = ?').run(id);
}

export function DeleteAuthorization(id: string): void {
  db.prepare('DELETE FROM cardanoTxAuthorizations WHERE id = ?').run(id);
}

export function GetRuleSettingsDraft(): RuleSettingDraft[] | null {
  const rows = db.prepare('SELECT * FROM ruleSettingsDraft').all() as RuleSettingDraft[];
  return rows.length ? rows : null;
}

export function GetRuleSettingsDraftById(id: string): RuleSettingDraft | null {
  return db.prepare('SELECT * FROM ruleSettingsDraft WHERE id = ?').get(id) as RuleSettingDraft | null;
}

export function UpdateRuleSettingDraftStatusById(id: string, newStatus: string): void {
  db.prepare('UPDATE ruleSettingsDraft SET status = ? WHERE id = ?').run(newStatus, id);
}

export function AddRuleSettingsDraft(userId: string, ruleReqDraft: string, ruleReqDraftJson: string): RuleSettingDraft | null {
  const id = crypto.randomUUID();
  const expiry = (Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60).toString();

  db.prepare('INSERT INTO ruleSettingsDraft (id, userId, ruleReqDraft, ruleReqDraftJson, expiry) VALUES (?, ?, ?, ?, ?)')
    .run(id, userId, ruleReqDraft, ruleReqDraftJson, expiry);

  return GetRuleSettingsDraftById(id);
}

export function DeleteRuleSettingsDraft(id: string): void {
  db.prepare('DELETE FROM ruleSettingsDraft WHERE id = ?').run(id);
}

export function GetRuleSettingsAuthorizationByDraftId(draftId: string): RuleSettingAuthorization[] | null {
  const rows = db.prepare('SELECT * FROM ruleSettingsAuthorization WHERE ruleSettingsDraftId = ?').all(draftId) as RuleSettingAuthorization[];
  return rows.length ? rows : null;
}

export function GetRuleSettingsAuthorizationsByDraft(ruleSettingsDraftId: string): RuleSettingAuthorization[] {
  return db.prepare('SELECT id, userId, authorization FROM ruleSettingsAuthorization WHERE ruleSettingsDraftId = ?').all(ruleSettingsDraftId) as RuleSettingAuthorization[];
}

export function AddRuleSettingsAuthorization(ruleSettingsDraftId: string, userId: string, authorization: string, rejected: boolean): void {
  const existing = db.prepare('SELECT * FROM ruleSettingsAuthorization WHERE ruleSettingsDraftId = ? AND userId = ?').get(ruleSettingsDraftId, userId);
  if (existing) throw new Error(`Authorization already exists for draft ${ruleSettingsDraftId} and user ${userId}`);

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO ruleSettingsAuthorization (id, userId, ruleSettingsDraftId, authorization, rejected) VALUES (?, ?, ?, ?, ?)')
    .run(id, userId, ruleSettingsDraftId, authorization, rejected ? 1 : 0);
}

export function DeleteRuleSettingsAuthorization(id: string): void {
  db.prepare('DELETE FROM ruleSettingsAuthorization WHERE id = ?').run(id);
}
