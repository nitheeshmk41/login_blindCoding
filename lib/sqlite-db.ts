import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { ContestState, Participant, Submission } from "./types";

export const DEFAULT_CONTEST_CODE = "BLIND2026";
const DATA_DIR = path.join(process.cwd(), "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "contest.db");
const db = new Database(DB_PATH);

// Enable WAL mode for high concurrency in Next.js
db.pragma("journal_mode = WAL");

// Initialize Schema & Clean Constraints
db.exec(`
  CREATE TABLE IF NOT EXISTS contest_settings (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    currentRound INTEGER NOT NULL DEFAULT 0,
    round1Unlocked INTEGER NOT NULL DEFAULT 0,
    round2Unlocked INTEGER NOT NULL DEFAULT 0,
    resultsPublished INTEGER NOT NULL DEFAULT 0,
    backgroundMusicEnabled INTEGER NOT NULL DEFAULT 1,
    backgroundMusicVolume REAL NOT NULL DEFAULT 0.25,
    demoDurationMinutes INTEGER NOT NULL DEFAULT 5,
    round1DurationMinutes INTEGER NOT NULL DEFAULT 25,
    round2DurationMinutes INTEGER NOT NULL DEFAULT 30,
    demoBufferMinutes INTEGER NOT NULL DEFAULT 2,
    round1BufferMinutes INTEGER NOT NULL DEFAULT 10,
    round2BufferMinutes INTEGER NOT NULL DEFAULT 10,
    durationMinutes INTEGER NOT NULL DEFAULT 60,
    startedAt TEXT,
    demoStartedAt TEXT,
    round1StartedAt TEXT,
    round2StartedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    contestCode TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    joinedAt TEXT NOT NULL,
    currentProblemIndex INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    totalScore INTEGER NOT NULL DEFAULT 0,
    lastActive TEXT NOT NULL,
    tabSwitchCount INTEGER NOT NULL DEFAULT 0,
    tabSwitchPenalty INTEGER NOT NULL DEFAULT 0
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_unique_email ON participants(contestCode, lower(email));
  CREATE INDEX IF NOT EXISTS idx_participants_code ON participants(contestCode);
  CREATE INDEX IF NOT EXISTS idx_participants_score ON participants(contestCode, totalScore DESC, lastActive ASC);

  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    participantId TEXT NOT NULL,
    participantName TEXT NOT NULL,
    contestCode TEXT NOT NULL,
    problemId TEXT NOT NULL,
    problemTitle TEXT NOT NULL,
    language TEXT NOT NULL,
    code TEXT NOT NULL,
    submittedAt TEXT NOT NULL,
    status TEXT NOT NULL,
    evaluationJson TEXT,
    tabSwitchCount INTEGER NOT NULL DEFAULT 0,
    tabSwitchPenalty INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_submissions_code ON submissions(contestCode);
  CREATE INDEX IF NOT EXISTS idx_submissions_participant ON submissions(participantId);
`);

// Dynamic column migration for existing sqlite db files
try {
  db.exec("ALTER TABLE contest_settings ADD COLUMN backgroundMusicVolume REAL NOT NULL DEFAULT 0.25");
} catch (e) {
  // Column already exists
}
try {
  db.exec("ALTER TABLE contest_settings ADD COLUMN currentTrackIndex INTEGER NOT NULL DEFAULT 0");
} catch (e) {
  // Column already exists
}

// Ensure single active row in contest_settings table
const settingsRows = db.prepare("SELECT code FROM contest_settings ORDER BY rowid ASC").all() as any[];
if (settingsRows.length === 0) {
  db.prepare(`
    INSERT INTO contest_settings (
      code, name, status, currentRound, round1Unlocked, round2Unlocked, resultsPublished,
      backgroundMusicEnabled, backgroundMusicVolume, demoDurationMinutes, round1DurationMinutes, round2DurationMinutes,
      demoBufferMinutes, round1BufferMinutes, round2BufferMinutes, durationMinutes
    ) VALUES (
      ?, ?, 'WAITING', 0, 0, 0, 0,
      1, 0.25, 5, 25, 30,
      2, 10, 10, 60
    )
  `).run(DEFAULT_CONTEST_CODE, "DC 2026 // BLIND CODING ARENA");
} else if (settingsRows.length > 1) {
  // If multiple rows exist from prior bugs, keep only the latest setting row
  const keepCode = settingsRows[settingsRows.length - 1].code;
  db.prepare("DELETE FROM contest_settings WHERE code != ?").run(keepCode);
}

// -------------------------------------------------------------
// HELPER FUNCTIONS FOR SINGLE ACTIVE CONTEST & DATA ACCESS
// -------------------------------------------------------------

export function getContestSettings(_code?: string): ContestState {
  let row = db.prepare("SELECT * FROM contest_settings ORDER BY rowid ASC LIMIT 1").get() as any;
  if (!row) {
    db.prepare(`
      INSERT INTO contest_settings (
        code, name, status, currentRound, round1Unlocked, round2Unlocked, resultsPublished,
        backgroundMusicEnabled, backgroundMusicVolume, demoDurationMinutes, round1DurationMinutes, round2DurationMinutes,
        demoBufferMinutes, round1BufferMinutes, round2BufferMinutes, durationMinutes
      ) VALUES (
        ?, ?, 'WAITING', 0, 0, 0, 0,
        1, 0.25, 5, 25, 30,
        2, 10, 10, 60
      )
    `).run(DEFAULT_CONTEST_CODE, "DC 2026 // BLIND CODING ARENA");
    row = db.prepare("SELECT * FROM contest_settings ORDER BY rowid ASC LIMIT 1").get() as any;
  }

  const activeCode = row.code;

  // Get isolated participants sorted code-wise (totalScore DESC, lastActive ASC)
  const participantsRows = db.prepare(`
    SELECT * FROM participants 
    WHERE contestCode = ? 
    ORDER BY totalScore DESC, lastActive ASC
  `).all(activeCode) as any[];

  const participants: Participant[] = participantsRows.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    contestCode: p.contestCode,
    joinedAt: p.joinedAt,
    currentProblemIndex: p.currentProblemIndex,
    completed: Boolean(p.completed),
    totalScore: p.totalScore,
    lastActive: p.lastActive,
    tabSwitchCount: p.tabSwitchCount,
    tabSwitchPenalty: p.tabSwitchPenalty,
  }));

  // Get isolated submissions
  const submissionsRows = db.prepare(`
    SELECT * FROM submissions 
    WHERE contestCode = ? 
    ORDER BY submittedAt DESC
  `).all(activeCode) as any[];

  const submissions: Submission[] = submissionsRows.map((s) => ({
    id: s.id,
    participantId: s.participantId,
    participantName: s.participantName,
    contestCode: s.contestCode,
    problemId: s.problemId,
    problemTitle: s.problemTitle,
    language: s.language,
    code: s.code,
    submittedAt: s.submittedAt,
    status: s.status as any,
    evaluation: s.evaluationJson ? JSON.parse(s.evaluationJson) : undefined,
    tabSwitchCount: s.tabSwitchCount,
    tabSwitchPenalty: s.tabSwitchPenalty,
  }));

  return {
    code: row.code,
    name: row.name,
    status: row.status as any,
    currentRound: row.currentRound,
    round1Unlocked: Boolean(row.round1Unlocked),
    round2Unlocked: Boolean(row.round2Unlocked),
    resultsPublished: Boolean(row.resultsPublished),
    backgroundMusicEnabled: Boolean(row.backgroundMusicEnabled),
    backgroundMusicVolume: row.backgroundMusicVolume !== undefined && row.backgroundMusicVolume !== null ? Number(row.backgroundMusicVolume) : 0.25,
    currentTrackIndex: row.currentTrackIndex !== undefined && row.currentTrackIndex !== null ? Number(row.currentTrackIndex) : 0,
    demoDurationMinutes: row.demoDurationMinutes,
    round1DurationMinutes: row.round1DurationMinutes,
    round2DurationMinutes: row.round2DurationMinutes,
    demoBufferMinutes: row.demoBufferMinutes,
    round1BufferMinutes: row.round1BufferMinutes,
    round2BufferMinutes: row.round2BufferMinutes,
    durationMinutes: row.durationMinutes,
    startedAt: row.startedAt || undefined,
    demoStartedAt: row.demoStartedAt || undefined,
    round1StartedAt: row.round1StartedAt || undefined,
    round2StartedAt: row.round2StartedAt || undefined,
    participants,
    submissions,
  };
}

export function updateContestSettings(_code: string | undefined, updates: Partial<ContestState>): ContestState {
  const current = getContestSettings();
  const updated = { ...current, ...updates };

  db.prepare(`
    UPDATE contest_settings SET
      name = ?,
      status = ?,
      currentRound = ?,
      round1Unlocked = ?,
      round2Unlocked = ?,
      resultsPublished = ?,
      backgroundMusicEnabled = ?,
      backgroundMusicVolume = ?,
      currentTrackIndex = ?,
      demoDurationMinutes = ?,
      round1DurationMinutes = ?,
      round2DurationMinutes = ?,
      demoBufferMinutes = ?,
      round1BufferMinutes = ?,
      round2BufferMinutes = ?,
      durationMinutes = ?,
      startedAt = ?,
      demoStartedAt = ?,
      round1StartedAt = ?,
      round2StartedAt = ?
    WHERE code = ?
  `).run(
    updated.name,
    updated.status,
    updated.currentRound,
    updated.round1Unlocked ? 1 : 0,
    updated.round2Unlocked ? 1 : 0,
    updated.resultsPublished ? 1 : 0,
    updated.backgroundMusicEnabled ? 1 : 0,
    updated.backgroundMusicVolume !== undefined ? updated.backgroundMusicVolume : 0.25,
    updated.currentTrackIndex !== undefined ? updated.currentTrackIndex : 0,
    updated.demoDurationMinutes,
    updated.round1DurationMinutes,
    updated.round2DurationMinutes,
    updated.demoBufferMinutes,
    updated.round1BufferMinutes,
    updated.round2BufferMinutes,
    updated.durationMinutes,
    updated.startedAt || null,
    updated.demoStartedAt || null,
    updated.round1StartedAt || null,
    updated.round2StartedAt || null,
    current.code
  );

  return getContestSettings();
}

export function updateContestCodeInDb(newCode: string): ContestState {
  const cleanCode = newCode.trim().toUpperCase();
  if (!cleanCode) return getContestSettings();

  const current = getContestSettings();
  const oldCode = current.code;

  if (oldCode !== cleanCode) {
    db.prepare("UPDATE contest_settings SET code = ? WHERE code = ?").run(cleanCode, oldCode);
    db.prepare("UPDATE participants SET contestCode = ? WHERE contestCode = ?").run(cleanCode, oldCode);
    db.prepare("UPDATE submissions SET contestCode = ? WHERE contestCode = ?").run(cleanCode, oldCode);
  }

  return getContestSettings();
}

export function addOrGetParticipant(participantData: Omit<Participant, "id" | "joinedAt" | "currentProblemIndex" | "completed" | "totalScore" | "lastActive">): Participant {
  const current = getContestSettings();
  const code = participantData.contestCode || current.code;
  const cleanEmail = participantData.email.trim().toLowerCase();
  const cleanName = participantData.name.trim();

  // 1. Check if participant already exists under this contest code by email OR name
  const existing = db.prepare(`
    SELECT * FROM participants 
    WHERE contestCode = ? AND (lower(email) = ? OR (lower(name) = ? AND length(name) > 2))
  `).get(code, cleanEmail, cleanName.toLowerCase()) as any;

  if (existing) {
    const now = new Date().toISOString();
    db.prepare("UPDATE participants SET lastActive = ?, name = ? WHERE id = ?").run(now, cleanName, existing.id);
    return {
      id: existing.id,
      name: cleanName,
      email: existing.email,
      phone: existing.phone,
      contestCode: existing.contestCode,
      joinedAt: existing.joinedAt,
      currentProblemIndex: existing.currentProblemIndex,
      completed: Boolean(existing.completed),
      totalScore: existing.totalScore,
      lastActive: now,
      tabSwitchCount: existing.tabSwitchCount || 0,
      tabSwitchPenalty: existing.tabSwitchPenalty || 0,
    };
  }

  // 2. Insert new unique participant
  const id = `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO participants (
      id, contestCode, name, email, phone, joinedAt, currentProblemIndex, completed, totalScore, lastActive, tabSwitchCount, tabSwitchPenalty
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 0, 0)
  `).run(id, code, cleanName, participantData.email, participantData.phone || null, now, now);

  return {
    id,
    name: cleanName,
    email: participantData.email,
    phone: participantData.phone,
    contestCode: code,
    joinedAt: now,
    currentProblemIndex: 0,
    completed: false,
    totalScore: 0,
    lastActive: now,
    tabSwitchCount: 0,
    tabSwitchPenalty: 0,
  };
}

export function updateParticipantInDb(id: string, updates: Partial<Participant>) {
  const existing = db.prepare("SELECT * FROM participants WHERE id = ?").get(id) as any;
  if (!existing) return;

  const currentProblemIndex = updates.currentProblemIndex !== undefined ? updates.currentProblemIndex : existing.currentProblemIndex;
  const completed = updates.completed !== undefined ? (updates.completed ? 1 : 0) : existing.completed;
  const totalScore = updates.totalScore !== undefined ? updates.totalScore : existing.totalScore;
  const lastActive = updates.lastActive || new Date().toISOString();
  const tabSwitchCount = updates.tabSwitchCount !== undefined ? updates.tabSwitchCount : existing.tabSwitchCount;
  const tabSwitchPenalty = updates.tabSwitchPenalty !== undefined ? updates.tabSwitchPenalty : existing.tabSwitchPenalty;

  db.prepare(`
    UPDATE participants SET
      currentProblemIndex = ?,
      completed = ?,
      totalScore = ?,
      lastActive = ?,
      tabSwitchCount = ?,
      tabSwitchPenalty = ?
    WHERE id = ?
  `).run(currentProblemIndex, completed, totalScore, lastActive, tabSwitchCount, tabSwitchPenalty, id);
}

// -------------------------------------------------------------
// SUBMISSIONS ACCESS & DEDUPLICATION
// -------------------------------------------------------------

export function addSubmissionToDb(sub: Submission): Submission {
  db.prepare(`
    INSERT OR REPLACE INTO submissions (
      id, participantId, participantName, contestCode, problemId, problemTitle,
      language, code, submittedAt, status, evaluationJson, tabSwitchCount, tabSwitchPenalty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sub.id,
    sub.participantId,
    sub.participantName,
    sub.contestCode,
    sub.problemId,
    sub.problemTitle,
    sub.language,
    sub.code,
    sub.submittedAt,
    sub.status,
    sub.evaluation ? JSON.stringify(sub.evaluation) : null,
    sub.tabSwitchCount || 0,
    sub.tabSwitchPenalty || 0
  );

  return sub;
}

export function updateSubmissionInDb(id: string, updates: Partial<Submission>) {
  const existing = db.prepare("SELECT * FROM submissions WHERE id = ?").get(id) as any;
  if (!existing) return;

  const status = updates.status || existing.status;
  const evaluationJson = updates.evaluation !== undefined ? JSON.stringify(updates.evaluation) : existing.evaluationJson;
  const tabSwitchCount = updates.tabSwitchCount !== undefined ? updates.tabSwitchCount : existing.tabSwitchCount;
  const tabSwitchPenalty = updates.tabSwitchPenalty !== undefined ? updates.tabSwitchPenalty : existing.tabSwitchPenalty;

  db.prepare(`
    UPDATE submissions SET
      status = ?,
      evaluationJson = ?,
      tabSwitchCount = ?,
      tabSwitchPenalty = ?
    WHERE id = ?
  `).run(status, evaluationJson, tabSwitchCount, tabSwitchPenalty, id);
}

export function resetDbContest(_code?: string) {
  const current = getContestSettings();
  db.prepare("DELETE FROM participants WHERE contestCode = ?").run(current.code);
  db.prepare("DELETE FROM submissions WHERE contestCode = ?").run(current.code);
  db.prepare(`
    UPDATE contest_settings SET
      status = 'WAITING',
      currentRound = 0,
      round1Unlocked = 0,
      round2Unlocked = 0,
      resultsPublished = 0,
      startedAt = NULL,
      demoStartedAt = NULL,
      round1StartedAt = NULL,
      round2StartedAt = NULL
    WHERE code = ?
  `).run(current.code);
}

export function purgeDuplicateParticipants(_code?: string) {
  const current = getContestSettings();
  db.prepare(`
    DELETE FROM participants 
    WHERE contestCode = ? AND id NOT IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY joinedAt ASC) as rn
        FROM participants
        WHERE contestCode = ?
      ) WHERE rn = 1
    )
  `).run(current.code, current.code);
}

export { db };
