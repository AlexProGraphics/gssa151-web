import ExcelJS from "exceljs";
import { dbAll } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import {
  CAMP_SEASON_LABEL,
  CARGO_LABEL,
  COMISION_LABEL,
  SURVEY_MTL_LABEL,
  type CargoRole,
  type ComisionRole,
  type SurveyMtlStatus,
} from "@/lib/types";

// Exporta las respuestas REALES de /encuesta (source = 'web') para que el
// kraal las analice fuera de la web. El volcado inicial del Excel
// (source = 'seed') no es una respuesta recibida — se deja fuera, igual
// que en la bandeja de /admin/respuestas.
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return new Response("No autenticado.", { status: 401 });
  }

  const scouters = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM scouters WHERE active = 1 ORDER BY name",
  );
  const nameById = new Map(scouters.map((s) => [s.id, s.name]));

  const responses = await dbAll<{
    scouterId: string;
    priorityPref: string | null;
    availability: string | null;
    freeText: string | null;
    availNavidad: number;
    availSemanaSanta: number;
    availVerano: number;
    mtlSelfStatus: SurveyMtlStatus | null;
    rolesText: string | null;
    castores: number | null;
    lobatos: number | null;
    tropa: number | null;
    escultas: number | null;
    clan: number | null;
    submittedAt: string;
  }>(
    `SELECT scouter_id AS scouterId, priority_pref AS priorityPref, availability, free_text AS freeText,
            avail_navidad AS availNavidad, avail_semana_santa AS availSemanaSanta,
            avail_verano AS availVerano, mtl_self_status AS mtlSelfStatus, roles_text AS rolesText,
            pref_castores AS castores, pref_lobatos AS lobatos, pref_tropa AS tropa,
            pref_escultas AS escultas, pref_clan AS clan, submitted_at AS submittedAt
     FROM survey_responses WHERE source = 'web'
     ORDER BY submitted_at DESC`,
  );

  const compatRows = await dbAll<{
    scouterId: string;
    otherId: string;
    type: "compatible" | "exclusion";
  }>("SELECT scouter_id AS scouterId, other_scouter_id AS otherId, type FROM survey_compatibility");

  const compatByScouter = new Map<string, string[]>();
  const exclusionByScouter = new Map<string, string[]>();
  for (const row of compatRows) {
    const target = row.type === "compatible" ? compatByScouter : exclusionByScouter;
    const list = target.get(row.scouterId) ?? [];
    list.push(nameById.get(row.otherId) ?? row.otherId);
    target.set(row.scouterId, list);
  }

  const roleRows = await dbAll<{ scouterId: string; roleType: "cargo" | "comision"; roleName: string }>(
    "SELECT scouter_id AS scouterId, role_type AS roleType, role_name AS roleName FROM survey_roles",
  );
  const cargosByScouter = new Map<string, string[]>();
  const comisionesByScouter = new Map<string, string[]>();
  for (const row of roleRows) {
    const target = row.roleType === "cargo" ? cargosByScouter : comisionesByScouter;
    const label =
      row.roleType === "cargo"
        ? CARGO_LABEL[row.roleName as CargoRole]
        : COMISION_LABEL[row.roleName as ComisionRole];
    const list = target.get(row.scouterId) ?? [];
    list.push(label ?? row.roleName);
    target.set(row.scouterId, list);
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Respuestas encuesta");
  sheet.columns = [
    { header: "Scouter", width: 22 },
    { header: "Enviado", width: 20 },
    { header: "Cargos", width: 24 },
    { header: "Comisiones", width: 30 },
    { header: "Cargos/comisiones — comentario", width: 30 },
    { header: "Puntos Castores", width: 18 },
    { header: "Puntos Lobatos", width: 18 },
    { header: "Puntos Tropa", width: 16 },
    { header: "Puntos Escultas", width: 18 },
    { header: "Puntos Clan", width: 16 },
    { header: "Prioridad", width: 18 },
    { header: "Navidad", width: 10 },
    { header: "Semana Santa", width: 14 },
    { header: "Verano", width: 10 },
    { header: "Detalle disponibilidad", width: 30 },
    { header: "Título MTL", width: 30 },
    { header: "Compatibles", width: 30 },
    { header: "Incompatibles", width: 30 },
    { header: "Comentario", width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const r of responses) {
    sheet.addRow([
      nameById.get(r.scouterId) ?? r.scouterId,
      new Date(r.submittedAt).toLocaleString("es-ES"),
      (cargosByScouter.get(r.scouterId) ?? []).join(", "),
      (comisionesByScouter.get(r.scouterId) ?? []).join(", "),
      r.rolesText ?? "",
      r.castores,
      r.lobatos,
      r.tropa,
      r.escultas,
      r.clan,
      r.priorityPref === "seccion"
        ? "Sección/rama"
        : r.priorityPref === "equipo"
          ? "Equipo de trabajo"
          : "",
      r.availNavidad ? CAMP_SEASON_LABEL.navidad : "",
      r.availSemanaSanta ? CAMP_SEASON_LABEL.semana_santa : "",
      r.availVerano ? CAMP_SEASON_LABEL.verano : "",
      r.availability ?? "",
      r.mtlSelfStatus ? SURVEY_MTL_LABEL[r.mtlSelfStatus] : "",
      (compatByScouter.get(r.scouterId) ?? []).join(", "),
      (exclusionByScouter.get(r.scouterId) ?? []).join(", "),
      r.freeText ?? "",
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="respuestas-encuesta-gssa151.xlsx"',
    },
  });
}
