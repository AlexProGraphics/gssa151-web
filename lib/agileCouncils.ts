import { dbAll, dbGet } from "./db";
import type { AgileCouncil, AgileReferenceLink } from "./types";

interface AgileCouncilRow {
  id: string;
  slug: string;
  title: string;
  eventDate: string | null;
  methodologyLink: string | null;
  calendarLink: string | null;
  calendarDriveLink: string | null;
  chavalesExcelLink: string | null;
  pagReferenceLinks: string | null;
  active: number;
  sortOrder: number;
  createdAt: string;
}

const SELECT_COLUMNS = `id, slug, title, event_date AS eventDate, methodology_link AS methodologyLink,
  calendar_link AS calendarLink, calendar_drive_link AS calendarDriveLink,
  chavales_excel_link AS chavalesExcelLink,
  pag_reference_links AS pagReferenceLinks,
  active, sort_order AS sortOrder, created_at AS createdAt`;

/** Los Row de libsql no son objetos planos — se reconstruyen campo a campo
 * (ver AGENTS/histórico del proyecto) antes de pasarlos a un Client Component. */
function toPlainCouncil(row: AgileCouncilRow): AgileCouncil {
  let pagReferenceLinks: AgileReferenceLink[] = [];
  try {
    pagReferenceLinks = row.pagReferenceLinks ? JSON.parse(row.pagReferenceLinks) : [];
  } catch {
    pagReferenceLinks = [];
  }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    eventDate: row.eventDate,
    methodologyLink: row.methodologyLink,
    calendarLink: row.calendarLink,
    calendarDriveLink: row.calendarDriveLink,
    chavalesExcelLink: row.chavalesExcelLink,
    pagReferenceLinks,
    active: row.active === 1,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  };
}

export async function listAgileCouncils(options: { onlyActive?: boolean } = {}): Promise<AgileCouncil[]> {
  const rows = await dbAll<AgileCouncilRow>(
    `SELECT ${SELECT_COLUMNS} FROM agile_councils
     ${options.onlyActive ? "WHERE active = 1" : ""}
     ORDER BY sort_order, created_at`,
  );
  return rows.map(toPlainCouncil);
}

export async function getAgileCouncilBySlug(slug: string): Promise<AgileCouncil | null> {
  const row = await dbGet<AgileCouncilRow>(`SELECT ${SELECT_COLUMNS} FROM agile_councils WHERE slug = ?`, [
    slug,
  ]);
  return row ? toPlainCouncil(row) : null;
}

/**
 * Fecha límite para rellenar la encuesta de un consejo: el jueves a las
 * 23:59 (hora de España) inmediatamente antes de la fecha del consejo — da
 * tiempo a la coordinación a revisar las respuestas antes de la reunión.
 * Genérico para cualquier consejo futuro, no solo para uno concreto.
 */
export function getAgileResponseDeadline(eventDate: string): Date {
  // El paseo hacia atrás hasta el jueves se hace en días de calendario UTC
  // (sin horas), para no depender de la zona horaria del servidor — solo al
  // final se fija la hora límite real en +02:00.
  const cursor = new Date(`${eventDate}T12:00:00Z`);
  do {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  } while (cursor.getUTCDay() !== 4); // 4 = jueves

  const y = cursor.getUTCFullYear();
  const m = String(cursor.getUTCMonth() + 1).padStart(2, "0");
  const d = String(cursor.getUTCDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T23:59:59+02:00`);
}

/** ¿Sigue abierto el plazo para rellenar la encuesta de este consejo? Si no
 * tiene fecha puesta, se trata como "siempre abierto" (nunca hay prisa). */
export function isAgileResponseWindowOpen(council: Pick<AgileCouncil, "eventDate">): boolean {
  if (!council.eventDate) return true;
  return Date.now() <= getAgileResponseDeadline(council.eventDate).getTime();
}

/** IDs de consejos activos para los que el scouter dado todavía no ha
 * enviado su encuesta y el plazo (jueves 23:59 antes del consejo) sigue
 * abierto — usado para el "puntito" de sin leer en la nav. */
export async function listPendingAgileCouncilIds(scouterId: string): Promise<Set<string>> {
  const councils = await listAgileCouncils({ onlyActive: true });
  const stillOpen = councils.filter((c) => isAgileResponseWindowOpen(c));
  if (stillOpen.length === 0) return new Set();

  const responded = new Set(
    (
      await dbAll<{ councilId: string }>(
        "SELECT council_id AS councilId FROM agile_council_responses WHERE scouter_id = ?",
        [scouterId],
      )
    ).map((r) => r.councilId),
  );

  return new Set(stillOpen.filter((c) => !responded.has(c.id)).map((c) => c.id));
}
