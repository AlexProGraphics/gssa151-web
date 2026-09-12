import { createClient, type Client, type InArgs } from "@libsql/client";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "./crypto";
import {
  SEED_ASSIGNMENTS,
  SEED_BRANCH_EXPERIENCE,
  SEED_PREFERENCES,
  SEED_SCORES,
  SEED_SCOUTERS,
  SEED_UNITS,
} from "./seedData";

// Únicos admins del grupo. Cuenta fija a propósito: no hay pantalla para
// cambiarla y se reafirma en cada arranque (ver ensureFixedAdmins), así que
// tocar la contraseña real solo es posible editando esta constante.
const FIXED_ADMIN_NAMES = ["Gabi", "Alex Muñoz"];
const FIXED_ADMIN_PASSWORD = "akela151";

// libSQL (Turso en producción, fichero local en desarrollo). Antes era
// node:sqlite con fichero local sin más, pero eso no sirve en hostings
// serverless (filesystem efímero) — ver README. En local, sin variables de
// entorno, sigue usando el mismo fichero data/gssa151.db de siempre.
let client: Client | null = null;
let ready: Promise<void> | null = null;

function createDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL ?? "file:./data/gssa151.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!process.env.TURSO_DATABASE_URL) {
    fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
  }
  return createClient(authToken ? { url, authToken } : { url });
}

/** Devuelve el cliente de base de datos, ya migrado y sembrado. */
export async function getDb(): Promise<Client> {
  if (!client) client = createDbClient();
  if (!ready) ready = initialize(client);
  await ready;
  return client;
}

async function initialize(db: Client) {
  await migrate(db);
  await seedIfEmpty(db);
  await ensureFixedAdmins(db);
}

// --- Helpers para no repetir `(await db.execute({sql, args})).rows` en cada sitio ---

export async function dbAll<T = Record<string, unknown>>(
  sql: string,
  args: InArgs = [],
): Promise<T[]> {
  const db = await getDb();
  const rs = await db.execute({ sql, args });
  return rs.rows as unknown as T[];
}

export async function dbGet<T = Record<string, unknown>>(
  sql: string,
  args: InArgs = [],
): Promise<T | undefined> {
  const rows = await dbAll<T>(sql, args);
  return rows[0];
}

/** INSERT/UPDATE/DELETE — devuelve rowsAffected. */
export async function dbRun(sql: string, args: InArgs = []): Promise<number> {
  const db = await getDb();
  const rs = await db.execute({ sql, args });
  return rs.rowsAffected;
}

async function migrate(db: Client) {
  // admin_users pasó de identificarse por email a identificarse por
  // scouter_id (el nombre se elige de un desplegable, como en la
  // encuesta). Si queda una tabla con el esquema antiguo, se sustituye —
  // solo contenía cuentas de prueba locales, nunca datos reales.
  const adminCols = (await db.execute("PRAGMA table_info(admin_users)")).rows as unknown as {
    name: string;
  }[];
  if (adminCols.some((c) => c.name === "email")) {
    await db.execute("DROP TABLE admin_users;");
  }

  // La sesión de admin dejó de ser independiente de la de scouter (ahora
  // todo el mundo usa scouter_sessions, admin es solo un permiso extra) —
  // la vieja tabla `sessions` ya no se usa.
  await db.execute("DROP TABLE IF EXISTS sessions;");

  // survey_responses ganó columnas nuevas (disponibilidad por temporada +
  // título de monitor autodeclarado) después de crearse — CREATE TABLE IF
  // NOT EXISTS no las añade a una tabla ya existente, así que se agregan
  // a mano si faltan.
  const surveyCols = new Set(
    ((await db.execute("PRAGMA table_info(survey_responses)")).rows as unknown as {
      name: string;
    }[]).map((c) => c.name),
  );
  if (surveyCols.size > 0) {
    if (!surveyCols.has("avail_navidad")) {
      await db.execute(
        "ALTER TABLE survey_responses ADD COLUMN avail_navidad INTEGER NOT NULL DEFAULT 0;",
      );
    }
    if (!surveyCols.has("avail_semana_santa")) {
      await db.execute(
        "ALTER TABLE survey_responses ADD COLUMN avail_semana_santa INTEGER NOT NULL DEFAULT 0;",
      );
    }
    if (!surveyCols.has("avail_verano")) {
      await db.execute(
        "ALTER TABLE survey_responses ADD COLUMN avail_verano INTEGER NOT NULL DEFAULT 0;",
      );
    }
    if (!surveyCols.has("mtl_self_status")) {
      await db.execute("ALTER TABLE survey_responses ADD COLUMN mtl_self_status TEXT;");
    }
    if (!surveyCols.has("source")) {
      // Todo lo que ya hubiera en la tabla antes de este cambio es el
      // volcado inicial del Excel, no una respuesta real por la web.
      await db.execute(
        "ALTER TABLE survey_responses ADD COLUMN source TEXT NOT NULL DEFAULT 'seed';",
      );
    }
    if (!surveyCols.has("roles_text")) {
      await db.execute("ALTER TABLE survey_responses ADD COLUMN roles_text TEXT;");
    }
  }

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scouters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Confidencial: solo se lee desde código que ya comprobó requireAdmin().
    CREATE TABLE IF NOT EXISTS scouter_scores (
      scouter_id TEXT PRIMARY KEY REFERENCES scouters(id) ON DELETE CASCADE,
      birth_year INTEGER,
      mtl_status TEXT,
      total_experience_years REAL,
      confianza INTEGER,
      lider_score INTEGER
    );

    -- Confidencial.
    CREATE TABLE IF NOT EXISTS scouter_branch_experience (
      scouter_id TEXT NOT NULL REFERENCES scouters(id) ON DELETE CASCADE,
      branch TEXT NOT NULL,
      years REAL NOT NULL,
      PRIMARY KEY (scouter_id, branch)
    );

    -- Pública: nombre + unidad es lo único que ve /parrillas y el export.
    CREATE TABLE IF NOT EXISTS assignments (
      scouter_id TEXT PRIMARY KEY REFERENCES scouters(id) ON DELETE CASCADE,
      unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
      assigned_by TEXT,
      assigned_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Confidencial: cualquiera puede escribir la suya (encuesta sin login),
    -- pero solo un admin autenticado la lee.
    CREATE TABLE IF NOT EXISTS survey_responses (
      scouter_id TEXT PRIMARY KEY REFERENCES scouters(id) ON DELETE CASCADE,
      priority_pref TEXT,
      availability TEXT,
      free_text TEXT,
      avail_navidad INTEGER NOT NULL DEFAULT 0,
      avail_semana_santa INTEGER NOT NULL DEFAULT 0,
      avail_verano INTEGER NOT NULL DEFAULT 0,
      mtl_self_status TEXT,
      pref_castores INTEGER,
      pref_lobatos INTEGER,
      pref_tropa INTEGER,
      pref_escultas INTEGER,
      pref_clan INTEGER,
      -- 'seed' = volcado inicial del Excel (no una respuesta real por la
      -- encuesta), 'web' = enviado de verdad desde /encuesta.
      source TEXT NOT NULL DEFAULT 'web',
      roles_text TEXT,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Cargos/comisiones que el scouter marca en la encuesta — solo
    -- informativo (no toca lib/scoring.ts), amplía el presupuesto de
    -- puntos que reparte en la propia encuesta (ver CARGO_POINTS/
    -- COMISION_POINTS en lib/types.ts).
    CREATE TABLE IF NOT EXISTS survey_roles (
      scouter_id TEXT NOT NULL REFERENCES scouters(id) ON DELETE CASCADE,
      role_type TEXT NOT NULL,
      role_name TEXT NOT NULL,
      PRIMARY KEY (scouter_id, role_type, role_name)
    );

    -- Confidencial.
    CREATE TABLE IF NOT EXISTS survey_compatibility (
      scouter_id TEXT NOT NULL REFERENCES scouters(id) ON DELETE CASCADE,
      other_scouter_id TEXT NOT NULL REFERENCES scouters(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      PRIMARY KEY (scouter_id, other_scouter_id, type)
    );

    -- Borrador de "Crea tu parrilla": el scratch personal de cada scouter,
    -- se pisa con cada movimiento (no toca la tabla assignments oficial).
    CREATE TABLE IF NOT EXISTS proposal_draft_assignments (
      owner_id TEXT NOT NULL REFERENCES scouters(id) ON DELETE CASCADE,
      scouter_id TEXT NOT NULL REFERENCES scouters(id) ON DELETE CASCADE,
      unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (owner_id, scouter_id)
    );

    -- Cada "Enviar propuesta" congela una copia del borrador aquí — se
    -- guarda un historial completo, no se sobrescribe el envío anterior.
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES scouters(id) ON DELETE CASCADE,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS proposal_assignments (
      proposal_id TEXT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
      scouter_id TEXT NOT NULL REFERENCES scouters(id) ON DELETE CASCADE,
      unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
      PRIMARY KEY (proposal_id, scouter_id)
    );

    -- Un admin es una identidad de scouter marcada como kraal/coordi
    -- (ver FIXED_ADMIN_NAMES) — no una cuenta de email aparte.
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      scouter_id TEXT NOT NULL UNIQUE REFERENCES scouters(id) ON DELETE CASCADE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Una fila = esa persona ha "reclamado" su identidad de scouter. La PK
    -- sobre scouter_id es lo que impide que nadie más se registre como esa
    -- misma persona una vez ya está reclamada.
    CREATE TABLE IF NOT EXISTS scouter_users (
      scouter_id TEXT PRIMARY KEY REFERENCES scouters(id) ON DELETE CASCADE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Sesión única para todo el mundo, admins incluidos: "admin" no tiene
    -- su propia tabla de sesiones, es el mismo login de scouter con
    -- permisos extra comprobados aparte (ver admin_users / getCurrentAdmin).
    CREATE TABLE IF NOT EXISTS scouter_sessions (
      token TEXT PRIMARY KEY,
      scouter_id TEXT NOT NULL REFERENCES scouters(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
  `);
}

async function seedIfEmpty(db: Client) {
  const countRow = (await db.execute("SELECT COUNT(*) AS count FROM units")).rows[0] as unknown as {
    count: number;
  };
  if (countRow.count > 0) return;

  const writes: { sql: string; args: InArgs }[] = [];

  for (const u of SEED_UNITS) {
    writes.push({
      sql: "INSERT INTO units (id, name, category, color, sort_order) VALUES (?, ?, ?, ?, ?)",
      args: [u.id, u.name, u.category, u.color, u.sortOrder],
    });
  }

  for (const s of SEED_SCOUTERS) {
    writes.push({
      sql: "INSERT INTO scouters (id, name) VALUES (?, ?)",
      args: [s.id, s.name],
    });
  }

  for (const [scouterId, score] of Object.entries(SEED_SCORES)) {
    writes.push({
      sql: `INSERT INTO scouter_scores
        (scouter_id, birth_year, mtl_status, total_experience_years, confianza, lider_score)
       VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        scouterId,
        score.birthYear,
        score.mtlStatus,
        score.totalExperienceYears,
        score.confianza,
        score.liderScore,
      ],
    });
  }

  for (const e of SEED_BRANCH_EXPERIENCE) {
    writes.push({
      sql: "INSERT INTO scouter_branch_experience (scouter_id, branch, years) VALUES (?, ?, ?)",
      args: [e.scouterId, e.branch, e.years],
    });
  }

  for (const [scouterId, p] of Object.entries(SEED_PREFERENCES)) {
    writes.push({
      sql: `INSERT INTO survey_responses (scouter_id, pref_castores, pref_lobatos, pref_tropa, pref_escultas, pref_clan, source)
       VALUES (?, ?, ?, ?, ?, ?, 'seed')`,
      args: [scouterId, p.castores, p.lobatos, p.tropa, p.escultas, p.clan],
    });
  }

  for (const a of SEED_ASSIGNMENTS) {
    writes.push({
      sql: "INSERT INTO assignments (scouter_id, unit_id) VALUES (?, ?)",
      args: [a.scouterId, a.unitId],
    });
  }

  // Un solo batch atómico en vez de cientos de round-trips sueltos — más
  // rápido en local y muchísimo más rápido contra Turso en producción.
  await db.batch(
    writes.map((w) => ({ sql: w.sql, args: w.args })),
    "write",
  );
}

/**
 * Se ejecuta en cada arranque: crea (o reafirma) la cuenta admin de cada
 * nombre en FIXED_ADMIN_NAMES con FIXED_ADMIN_PASSWORD. No hay pantalla
 * para cambiar esta contraseña — la única forma de cambiarla es editando
 * la constante y reiniciando el servidor.
 */
async function ensureFixedAdmins(db: Client) {
  const passwordHash = hashPassword(FIXED_ADMIN_PASSWORD);

  for (const name of FIXED_ADMIN_NAMES) {
    const scouter = (await db.execute({
      sql: "SELECT id FROM scouters WHERE name = ?",
      args: [name],
    })).rows[0] as unknown as { id: string } | undefined;
    if (!scouter) continue;

    await db.execute({
      sql: `INSERT INTO admin_users (id, scouter_id, password_hash) VALUES (?, ?, ?)
       ON CONFLICT(scouter_id) DO UPDATE SET password_hash = excluded.password_hash`,
      args: [crypto.randomUUID(), scouter.id, passwordHash],
    });
  }
}
