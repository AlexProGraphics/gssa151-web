import crypto from "node:crypto";
import { cookies } from "next/headers";
import { dbGet, dbRun } from "./db";
import { hashPassword, verifyPassword } from "./crypto";

export { hashPassword, verifyPassword };

export const SESSION_COOKIE = "gssa151_session";
const SESSION_DAYS = 30;

/** Admin = una identidad de scouter marcada como kraal/coordi (ver FIXED_ADMIN_NAMES en lib/db.ts). */
export interface AdminUser {
  id: string;
  scouterId: string;
  name: string;
}

export async function findAdminByScouterId(
  scouterId: string,
): Promise<(AdminUser & { passwordHash: string }) | null> {
  const row = await dbGet<{ id: string; scouterId: string; name: string; passwordHash: string }>(
    `SELECT admin_users.id AS id, admin_users.scouter_id AS scouterId, scouters.name AS name,
            admin_users.password_hash AS passwordHash
     FROM admin_users JOIN scouters ON scouters.id = admin_users.scouter_id
     WHERE admin_users.scouter_id = ?`,
    [scouterId],
  );
  return row ?? null;
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await dbRun("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", [
    token,
    userId,
    expiresAt,
  ]);
  return token;
}

export async function deleteSession(token: string) {
  await dbRun("DELETE FROM sessions WHERE token = ?", [token]);
}

export async function getSessionUser(token: string | undefined): Promise<AdminUser | null> {
  if (!token) return null;
  const row = await dbGet<{ id: string; scouterId: string; name: string; expiresAt: string }>(
    `SELECT admin_users.id AS id, admin_users.scouter_id AS scouterId, scouters.name AS name,
            sessions.expires_at AS expiresAt
     FROM sessions
     JOIN admin_users ON admin_users.id = sessions.user_id
     JOIN scouters ON scouters.id = admin_users.scouter_id
     WHERE sessions.token = ?`,
    [token],
  );

  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await deleteSession(token);
    return null;
  }
  return { id: row.id, scouterId: row.scouterId, name: row.name };
}

/** Server Component / Server Action helper — returns the logged-in admin or null. */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  return getSessionUser(cookieStore.get(SESSION_COOKIE)?.value);
}

/** Throws if there is no logged-in admin — use at the top of admin-only Server Actions. */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getCurrentAdmin();
  if (!user) throw new Error("No autenticado.");
  return user;
}

// --- Cuentas de scouter (una identidad = una cuenta, sin recuperación propia) ---

export const SCOUTER_SESSION_COOKIE = "gssa151_scouter_session";

export interface ScouterUser {
  scouterId: string;
  name: string;
}

export async function findScouterAccount(
  scouterId: string,
): Promise<{ passwordHash: string } | null> {
  const row = await dbGet<{ passwordHash: string }>(
    "SELECT password_hash AS passwordHash FROM scouter_users WHERE scouter_id = ?",
    [scouterId],
  );
  return row ?? null;
}

/** Crea la cuenta la primera vez que alguien reclama esa identidad. Lanza si ya existe. */
export async function registerScouterAccount(scouterId: string, password: string) {
  try {
    await dbRun("INSERT INTO scouter_users (scouter_id, password_hash) VALUES (?, ?)", [
      scouterId,
      hashPassword(password),
    ]);
  } catch {
    throw new Error("Esa persona ya tiene una cuenta registrada.");
  }
}

/** Solo para admins: fuerza una nueva contraseña sobre una cuenta ya reclamada. */
export async function adminSetScouterPassword(scouterId: string, password: string) {
  const changes = await dbRun("UPDATE scouter_users SET password_hash = ? WHERE scouter_id = ?", [
    hashPassword(password),
    scouterId,
  ]);
  if (changes === 0) {
    throw new Error("Ese scouter todavía no se ha registrado.");
  }
}

export async function createScouterSession(scouterId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await dbRun("INSERT INTO scouter_sessions (token, scouter_id, expires_at) VALUES (?, ?, ?)", [
    token,
    scouterId,
    expiresAt,
  ]);
  return token;
}

export async function deleteScouterSession(token: string) {
  await dbRun("DELETE FROM scouter_sessions WHERE token = ?", [token]);
}

async function getScouterSessionUser(token: string | undefined): Promise<ScouterUser | null> {
  if (!token) return null;
  const row = await dbGet<{ scouterId: string; name: string; expiresAt: string }>(
    `SELECT scouters.id AS scouterId, scouters.name AS name, scouter_sessions.expires_at AS expiresAt
     FROM scouter_sessions JOIN scouters ON scouters.id = scouter_sessions.scouter_id
     WHERE scouter_sessions.token = ?`,
    [token],
  );

  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await deleteScouterSession(token);
    return null;
  }
  return { scouterId: row.scouterId, name: row.name };
}

export async function getCurrentScouter(): Promise<ScouterUser | null> {
  const cookieStore = await cookies();
  return getScouterSessionUser(cookieStore.get(SCOUTER_SESSION_COOKIE)?.value);
}

/** Throws if there is no logged-in scouter — use at the top of scouter-only Server Actions. */
export async function requireScouter(): Promise<ScouterUser> {
  const user = await getCurrentScouter();
  if (!user) throw new Error("No autenticado.");
  return user;
}
