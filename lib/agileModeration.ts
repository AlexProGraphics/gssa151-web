import crypto from "node:crypto";
import { dbAll, dbGet, dbRun } from "./db";

export interface ModerationParticipant {
  scouterId: string;
  name: string;
  active: boolean;
  penalized: boolean;
  addedManually: boolean;
  respondedSurvey: boolean;
  totalSpokenSeconds: number;
  interventionsCount: number;
}

export interface OpenIntervention {
  id: string;
  scouterId: string;
  durationSeconds: number;
  startedAt: string;
  agendaItemId: string | null;
}

export interface AgendaItem {
  id: string;
  sortOrder: number;
  groupLabel: string | null;
  title: string;
  description: string | null;
  plannedMinutes: number;
  surveyField: SurveyField | null;
  turnSeconds: number | null;
  elapsedSeconds: number;
  running: boolean;
  startedAt: string | null;
}

export interface AgendaEntitlement {
  scouterId: string;
  granted: number;
  used: number;
  remaining: number;
}

/** Apartados de la encuesta de un consejo que dan turno automático a quien
 * escribió algo ahí — ver AGENDA_TEMPLATE y computeEntitlements. */
export type SurveyField =
  | "pag_social"
  | "pag_ambiental"
  | "pag_espiritual"
  | "pag_salud"
  | "calendar"
  | "chavales"
  | "ruegos";

/** Columna real de agile_council_responses que decide si alguien tiene
 * turno por defecto en un punto ligado a ese apartado de la encuesta. */
const SURVEY_FIELD_COLUMN: Record<SurveyField, string> = {
  pag_social: "pag_social",
  pag_ambiental: "pag_ambiental",
  pag_espiritual: "pag_espiritual",
  pag_salud: "pag_salud",
  calendar: "calendar_comments",
  chavales: "chavales_comments",
  ruegos: "ruegos_preguntas",
};

const PAG_GROUP_LABEL = "Proyecto Anual de Grupo (PAG) 2026/2027";

/** Orden del día real de un consejo AGILE — se siembra una vez por consejo
 * (ver ensureAgendaSeeded) y el admin puede después editar los minutos
 * planificados de cada punto. Los 4 ámbitos del PAG son puntos
 * independientes (cada uno con su propio turno de 30s) agrupados solo
 * visualmente bajo group_label. */
const AGENDA_TEMPLATE: {
  groupLabel: string | null;
  title: string;
  description: string | null;
  plannedMinutes: number;
  surveyField: SurveyField | null;
  turnSeconds: number | null;
}[] = [
  {
    groupLabel: null,
    title: "Aprobación del acta anterior",
    description: null,
    plannedMinutes: 5,
    surveyField: null,
    turnSeconds: null,
  },
  {
    groupLabel: null,
    title: "Scouter 151: introducción al GSSA, herramientas y compromiso",
    description: null,
    plannedMinutes: 20,
    surveyField: null,
    turnSeconds: null,
  },
  {
    groupLabel: null,
    title: "Presentación equipos de Cargos y Comisiones",
    description:
      "Secretaría, Tesorería e Intendencia · Comisiones de trabajo (Campamentos, Menú, J. de Grupo, Redes, Formaciones, Socorrismo…)",
    plannedMinutes: 20,
    surveyField: null,
    turnSeconds: null,
  },
  {
    groupLabel: null,
    title: "Aprobación definitiva del Calendario de Ronda 2026/2027",
    description: "Primer, segundo y tercer trimestre · Campa de Verano y Jamboree",
    plannedMinutes: 45,
    surveyField: "calendar",
    turnSeconds: null,
  },
  {
    groupLabel: null,
    title: "Movimiento",
    description: null,
    plannedMinutes: 10,
    surveyField: null,
    turnSeconds: null,
  },
  {
    groupLabel: PAG_GROUP_LABEL,
    title: "PAG — Social",
    description: null,
    plannedMinutes: 22.5,
    surveyField: "pag_social",
    turnSeconds: 30,
  },
  {
    groupLabel: PAG_GROUP_LABEL,
    title: "PAG — Ambiental",
    description: null,
    plannedMinutes: 22.5,
    surveyField: "pag_ambiental",
    turnSeconds: 30,
  },
  {
    groupLabel: PAG_GROUP_LABEL,
    title: "PAG — Espiritual",
    description: null,
    plannedMinutes: 22.5,
    surveyField: "pag_espiritual",
    turnSeconds: 30,
  },
  {
    groupLabel: PAG_GROUP_LABEL,
    title: "PAG — Salud",
    description: null,
    plannedMinutes: 22.5,
    surveyField: "pag_salud",
    turnSeconds: 30,
  },
  {
    groupLabel: null,
    title: "Pasos de sección",
    description: null,
    plannedMinutes: 15,
    surveyField: "chavales",
    turnSeconds: null,
  },
  {
    groupLabel: null,
    title: "Ruegos y preguntas",
    description: null,
    plannedMinutes: 10,
    surveyField: "ruegos",
    turnSeconds: null,
  },
];

/** Siembra el orden del día una sola vez por consejo — si ya tiene algún
 * punto (aunque el admin haya editado los minutos), no toca nada. */
async function ensureAgendaSeeded(councilId: string) {
  const existing = await dbGet<{ count: number }>(
    "SELECT COUNT(*) AS count FROM agile_moderation_agenda_items WHERE council_id = ?",
    [councilId],
  );
  if ((existing?.count ?? 0) > 0) return;

  const writes = AGENDA_TEMPLATE.map((item, index) => ({
    sql: `INSERT INTO agile_moderation_agenda_items
      (id, council_id, sort_order, group_label, title, description, planned_minutes, survey_field, turn_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      crypto.randomUUID(),
      councilId,
      index,
      item.groupLabel,
      item.title,
      item.description,
      item.plannedMinutes,
      item.surveyField,
      item.turnSeconds,
    ],
  }));

  for (const w of writes) {
    await dbRun(w.sql, w.args);
  }
}

/** Da de alta en el panel a quien ya haya respondido la encuesta de este
 * consejo y todavía no esté — así aparecen solos al abrir la pestaña, sin
 * que el admin tenga que añadirlos uno a uno. Idempotente (ON CONFLICT DO
 * NOTHING): no pisa a nadie ya presente, así que es seguro llamarla en cada
 * carga de la página (recoge también a quien responda a mitad de reunión). */
async function ensureParticipantsSeeded(councilId: string) {
  await dbRun(
    `INSERT INTO agile_moderation_participants (council_id, scouter_id, penalized, added_manually)
     SELECT r.council_id, r.scouter_id, 0, 0
     FROM agile_council_responses r
     WHERE r.council_id = ?
     ON CONFLICT(council_id, scouter_id) DO NOTHING`,
    [councilId],
  );
}

export async function getModerationParticipants(councilId: string): Promise<ModerationParticipant[]> {
  await ensureParticipantsSeeded(councilId);

  const rows = await dbAll<{
    scouterId: string;
    name: string;
    active: number;
    penalized: number;
    addedManually: number;
    respondedSurvey: number;
    totalSpokenSeconds: number | null;
    interventionsCount: number;
  }>(
    `SELECT p.scouter_id AS scouterId, s.name AS name, s.active AS active,
            p.penalized AS penalized, p.added_manually AS addedManually,
            EXISTS(
              SELECT 1 FROM agile_council_responses r
              WHERE r.council_id = p.council_id AND r.scouter_id = p.scouter_id
            ) AS respondedSurvey,
            (
              SELECT COALESCE(SUM(i.elapsed_seconds), 0) FROM agile_moderation_interventions i
              WHERE i.council_id = p.council_id AND i.scouter_id = p.scouter_id AND i.ended_at IS NOT NULL
            ) AS totalSpokenSeconds,
            (
              SELECT COUNT(*) FROM agile_moderation_interventions i
              WHERE i.council_id = p.council_id AND i.scouter_id = p.scouter_id AND i.ended_at IS NOT NULL
            ) AS interventionsCount
     FROM agile_moderation_participants p
     JOIN scouters s ON s.id = p.scouter_id
     WHERE p.council_id = ?
     ORDER BY s.name`,
    [councilId],
  );

  return rows.map((r) => ({
    scouterId: r.scouterId,
    name: r.name,
    active: r.active === 1,
    penalized: r.penalized === 1,
    addedManually: r.addedManually === 1,
    respondedSurvey: r.respondedSurvey === 1,
    totalSpokenSeconds: r.totalSpokenSeconds ?? 0,
    interventionsCount: r.interventionsCount,
  }));
}

/** El turno de palabra sin cerrar (si lo hay) — permite recuperar la cuenta
 * atrás en marcha si el admin recarga la página a mitad de un turno. */
export async function getOpenIntervention(councilId: string): Promise<OpenIntervention | null> {
  const row = await dbGet<{
    id: string;
    scouterId: string;
    durationSeconds: number;
    startedAt: string;
    agendaItemId: string | null;
  }>(
    `SELECT id, scouter_id AS scouterId, duration_seconds AS durationSeconds, started_at AS startedAt,
            agenda_item_id AS agendaItemId
     FROM agile_moderation_interventions
     WHERE council_id = ? AND ended_at IS NULL`,
    [councilId],
  );
  if (!row) return null;
  // Los Row de libsql no son objetos planos — se reconstruyen campo a campo
  // antes de pasarlos a un Client Component (ver AgileModerationPanel).
  return {
    id: row.id,
    scouterId: row.scouterId,
    durationSeconds: row.durationSeconds,
    startedAt: row.startedAt,
    agendaItemId: row.agendaItemId,
  };
}

/** Scouters activos que todavía no están en el panel — para el desplegable
 * de "añadir persona a mano". */
export async function listAddableScouters(councilId: string): Promise<{ id: string; name: string }[]> {
  const rows = await dbAll<{ id: string; name: string }>(
    `SELECT s.id, s.name FROM scouters s
     WHERE s.active = 1
       AND s.id NOT IN (SELECT scouter_id FROM agile_moderation_participants WHERE council_id = ?)
     ORDER BY s.name`,
    [councilId],
  );
  // Igual que arriba: reconstruidos a objetos planos para el Client Component.
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

/** Orden del día completo, con el tiempo transcurrido ya calculado (si un
 * punto está en marcha, se le suma lo corrido desde started_at). Se siembra
 * solo la primera vez que se pide, igual que ensureParticipantsSeeded. */
export async function getAgendaItems(councilId: string): Promise<AgendaItem[]> {
  await ensureAgendaSeeded(councilId);

  const rows = await dbAll<{
    id: string;
    sortOrder: number;
    groupLabel: string | null;
    title: string;
    description: string | null;
    plannedMinutes: number;
    surveyField: SurveyField | null;
    turnSeconds: number | null;
    startedAt: string | null;
    accumulatedSeconds: number;
  }>(
    `SELECT id, sort_order AS sortOrder, group_label AS groupLabel, title, description,
            planned_minutes AS plannedMinutes, survey_field AS surveyField, turn_seconds AS turnSeconds,
            started_at AS startedAt, accumulated_seconds AS accumulatedSeconds
     FROM agile_moderation_agenda_items
     WHERE council_id = ?
     ORDER BY sort_order`,
    [councilId],
  );

  return rows.map((r) => {
    const running = r.startedAt !== null;
    const liveSeconds = running
      ? Math.max(0, Math.round((Date.now() - new Date(r.startedAt as string).getTime()) / 1000))
      : 0;
    return {
      id: r.id,
      sortOrder: r.sortOrder,
      groupLabel: r.groupLabel,
      title: r.title,
      description: r.description,
      plannedMinutes: r.plannedMinutes,
      surveyField: r.surveyField,
      turnSeconds: r.turnSeconds,
      elapsedSeconds: r.accumulatedSeconds + liveSeconds,
      running,
      startedAt: r.startedAt,
    };
  });
}

/** Cuántas intervenciones tiene concedidas/usadas/le quedan a cada
 * participante en un punto concreto del orden del día — solo tiene sentido
 * para puntos con surveyField (los demás no reparten turnos automáticos).
 * Concedidas = 1 si escribió algo en el apartado de la encuesta
 * correspondiente + los extras que le haya dado un admin a mano. */
export async function getAgendaEntitlements(
  councilId: string,
  agendaItemId: string,
  surveyField: SurveyField,
): Promise<Map<string, AgendaEntitlement>> {
  const column = SURVEY_FIELD_COLUMN[surveyField];

  const rows = await dbAll<{
    scouterId: string;
    defaultGranted: number;
    extraGranted: number;
    used: number;
  }>(
    `SELECT p.scouter_id AS scouterId,
            CASE WHEN TRIM(COALESCE(r.${column}, '')) <> '' THEN 1 ELSE 0 END AS defaultGranted,
            COALESCE(g.extra_count, 0) AS extraGranted,
            (
              SELECT COUNT(*) FROM agile_moderation_interventions i
              WHERE i.council_id = p.council_id AND i.scouter_id = p.scouter_id
                AND i.agenda_item_id = ? AND i.ended_at IS NOT NULL
            ) AS used
     FROM agile_moderation_participants p
     LEFT JOIN agile_council_responses r ON r.council_id = p.council_id AND r.scouter_id = p.scouter_id
     LEFT JOIN agile_moderation_intervention_grants g
       ON g.council_id = p.council_id AND g.scouter_id = p.scouter_id AND g.agenda_item_id = ?
     WHERE p.council_id = ?`,
    [agendaItemId, agendaItemId, councilId],
  );

  const map = new Map<string, AgendaEntitlement>();
  for (const r of rows) {
    const granted = r.defaultGranted + r.extraGranted;
    map.set(r.scouterId, {
      scouterId: r.scouterId,
      granted,
      used: r.used,
      remaining: Math.max(0, granted - r.used),
    });
  }
  return map;
}
