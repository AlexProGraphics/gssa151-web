import crypto from "node:crypto";
import { cookies } from "next/headers";
import { dbGet, dbRun } from "./db";
import { hashPassword, verifyPassword } from "./crypto";

export { hashPassword, verifyPassword };

const SESSION_DAYS = 30;

// --- Sesión única ---
//
// Cada persona inicia sesión UNA vez, como un scouter más (ver
// findScouterAccount/registerScouterAccount más abajo). "Admin" no es un
// login aparte: es simplemente que ese scouter_id concreto también aparece
// en admin_users (ver FIXED_ADMIN_NAMES en lib/db.ts), lo que le da
// permisos extra por encima de su misma sesión de scouter. Por eso solo hay
// una cookie y una tabla de sesiones (scouter_sessions) para todo el mundo.

export const SESSION_COOKIE = "gssa151_session";

export interface CurrentUser {
  scouterId: string;
  name: string;
}

export async function createSession(scouterId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await dbRun("INSERT INTO scouter_sessions (token, scouter_id, expires_at) VALUES (?, ?, ?)", [
    token,
    scouterId,
    expiresAt,
  ]);
  return token;
}

export async function deleteSession(token: string) {
  await dbRun("DELETE FROM scouter_sessions WHERE token = ?", [token]);
}

/** Toma directamente el token (no la cookie de next/headers) — la usa proxy.ts, que corre en middleware. */
export async function getSessionUser(token: string | undefined): Promise<CurrentUser | null> {
  if (!token) return null;
  const row = await dbGet<{ scouterId: string; name: string; expiresAt: string }>(
    `SELECT scouters.id AS scouterId, scouters.name AS name, scouter_sessions.expires_at AS expiresAt
     FROM scouter_sessions JOIN scouters ON scouters.id = scouter_sessions.scouter_id
     WHERE scouter_sessions.token = ?`,
    [token],
  );

  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await deleteSession(token);
    return null;
  }
  return { scouterId: row.scouterId, name: row.name };
}

/** Server Component / Server Action helper — la única sesión que existe, admin o no. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  return getSessionUser(cookieStore.get(SESSION_COOKIE)?.value);
}

/** Alias histórico: "scouter" y "usuario actual" son ya lo mismo. */
export const getCurrentScouter = getCurrentUser;

/** Throws if there is no logged-in user — use at the top of cualquier Server Action que requiera sesión. */
export async function requireScouter(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  return user;
}

// --- Permisos de admin (una capa encima de la sesión de scouter) ---

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

/** Server Component / Server Action helper — el usuario actual, solo si además es admin. */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const admin = await findAdminByScouterId(user.scouterId);
  return admin ? { id: admin.id, scouterId: admin.scouterId, name: admin.name } : null;
}

/** Throws if the logged-in user isn't an admin — use at the top of admin-only Server Actions. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("No autenticado.");
  return admin;
}

// --- Cuentas de scouter (una identidad = una cuenta, sin recuperación propia) ---

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
