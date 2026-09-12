import { redirect } from "next/navigation";
import { dbAll } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import {
  BRANCH_LABEL,
  BRANCHES,
  CAMP_SEASONS,
  CAMP_SEASON_LABEL,
  SURVEY_MTL_LABEL,
  type PriorityPref,
  type SurveyMtlStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const PRIORITY_LABEL: Record<PriorityPref, string> = {
  seccion: "La sección/rama",
  equipo: "El equipo de trabajo",
};

export default async function AdminRespuestasPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login?next=/admin/respuestas");

  const scouters = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM scouters WHERE active = 1 ORDER BY name",
  );
  const nameById = new Map(scouters.map((s) => [s.id, s.name]));

  const registeredIds = new Set(
    (await dbAll<{ scouter_id: string }>("SELECT scouter_id FROM scouter_users")).map(
      (r) => r.scouter_id,
    ),
  );

  // Solo respuestas enviadas de verdad por /encuesta — el volcado inicial
  // del Excel (source='seed') se usó para montar la primera parrilla pero
  // no es una respuesta que haya "llegado" a este buzón.
  const responseRows = await dbAll<{
    scouterId: string;
    priorityPref: PriorityPref | null;
    availability: string | null;
    freeText: string | null;
    availNavidad: number;
    availSemanaSanta: number;
    availVerano: number;
    mtlSelfStatus: SurveyMtlStatus | null;
    castores: number | null;
    lobatos: number | null;
    tropa: number | null;
    escultas: number | null;
    clan: number | null;
    submittedAt: string;
  }>(
    `SELECT scouter_id AS scouterId, priority_pref AS priorityPref, availability, free_text AS freeText,
            avail_navidad AS availNavidad, avail_semana_santa AS availSemanaSanta,
            avail_verano AS availVerano, mtl_self_status AS mtlSelfStatus,
            pref_castores AS castores, pref_lobatos AS lobatos, pref_tropa AS tropa,
            pref_escultas AS escultas, pref_clan AS clan, submitted_at AS submittedAt
     FROM survey_responses WHERE source = 'web'`,
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

  const responded = responseRows
    .filter((r) => nameById.has(r.scouterId))
    .map((r) => ({ ...r, name: nameById.get(r.scouterId)! }))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const respondedIds = new Set(responseRows.map((r) => r.scouterId));
  const pending = scouters.filter((s) => !respondedIds.has(s.id));

  const units = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM units ORDER BY sort_order",
  );

  const proposalRows = await dbAll<{ id: string; ownerId: string; submittedAt: string }>(
    `SELECT proposals.id AS id, proposals.owner_id AS ownerId, proposals.submitted_at AS submittedAt
     FROM proposals ORDER BY submitted_at DESC`,
  );

  const proposalAssignmentRows = await dbAll<{
    proposalId: string;
    scouterId: string;
    unitId: string;
  }>(
    "SELECT proposal_id AS proposalId, scouter_id AS scouterId, unit_id AS unitId FROM proposal_assignments",
  );

  const assignmentsByProposal = new Map<string, { scouterId: string; unitId: string }[]>();
  for (const row of proposalAssignmentRows) {
    const list = assignmentsByProposal.get(row.proposalId) ?? [];
    list.push(row);
    assignmentsByProposal.set(row.proposalId, list);
  }

  const proposals = proposalRows
    .filter((p) => nameById.has(p.ownerId))
    .map((p) => {
      const assignmentRows = assignmentsByProposal.get(p.id) ?? [];
      const byUnit = new Map<string, string[]>();
      for (const a of assignmentRows) {
        const list = byUnit.get(a.unitId) ?? [];
        list.push(nameById.get(a.scouterId) ?? a.scouterId);
        byUnit.set(a.unitId, list);
      }
      const placedIds = new Set(assignmentRows.map((a) => a.scouterId));
      const unassigned = scouters.filter((s) => !placedIds.has(s.id)).map((s) => s.name);
      return {
        id: p.id,
        ownerName: nameById.get(p.ownerId)!,
        submittedAt: p.submittedAt,
        byUnit,
        unassigned,
      };
    });

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Respuestas de la encuesta</h1>
          <p className="mt-1 text-sm text-muted">
            {responded.length} de {scouters.length} han respondido ·{" "}
            {registeredIds.size} cuentas registradas · {proposals.length} propuestas de
            parrilla recibidas.
          </p>
        </div>
        <a
          href="/api/export/excel/encuesta"
          className="whitespace-nowrap rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:border-accent"
        >
          Exportar a Excel
        </a>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted">Bandeja de respuestas</h2>
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {responded.map((r) => (
            <details key={r.scouterId} className="p-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">{r.name}</span>
                <span className="whitespace-nowrap text-xs text-muted">
                  {new Date(r.submittedAt).toLocaleString("es-ES")}
                </span>
              </summary>
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                <div className="grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-5">
                  {BRANCHES.map((branch) => (
                    <div key={branch}>
                      {BRANCH_LABEL[branch]}:{" "}
                      <span className="text-foreground">{r[branch] ?? 0} pts</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted">
                  Prioridad:{" "}
                  <span className="text-foreground">
                    {r.priorityPref ? PRIORITY_LABEL[r.priorityPref] : "—"}
                  </span>
                </p>
                <p className="text-xs text-muted">
                  Disponible en:{" "}
                  <span className="text-foreground">
                    {CAMP_SEASONS.filter(
                      (season) =>
                        (season === "navidad" && r.availNavidad) ||
                        (season === "semana_santa" && r.availSemanaSanta) ||
                        (season === "verano" && r.availVerano),
                    )
                      .map((season) => CAMP_SEASON_LABEL[season])
                      .join(", ") || "ninguno marcado"}
                  </span>
                </p>
                <p className="text-xs text-muted">
                  Detalle disponibilidad:{" "}
                  <span className="text-foreground">{r.availability ?? "—"}</span>
                </p>
                <p className="text-xs text-muted">
                  Título MTL:{" "}
                  <span className="text-foreground">
                    {r.mtlSelfStatus ? SURVEY_MTL_LABEL[r.mtlSelfStatus] : "—"}
                  </span>
                </p>
                <p className="text-xs text-muted">
                  Compatibles:{" "}
                  <span className="text-foreground">
                    {(compatByScouter.get(r.scouterId) ?? []).join(", ") || "—"}
                  </span>
                </p>
                <p className="text-xs text-muted">
                  Incompatibles:{" "}
                  <span className="text-foreground">
                    {(exclusionByScouter.get(r.scouterId) ?? []).join(", ") || "—"}
                  </span>
                </p>
                {r.freeText && (
                  <p className="rounded-md border border-border bg-surface p-2 text-xs text-foreground">
                    “{r.freeText}”
                  </p>
                )}
              </div>
            </details>
          ))}
          {responded.length === 0 && (
            <p className="p-4 text-sm text-muted">Todavía no hay respuestas.</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted">Propuestas de parrilla</h2>
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {proposals.map((p) => (
            <details key={p.id} className="p-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">
                  Propuesta de {p.ownerName}
                </span>
                <span className="whitespace-nowrap text-xs text-muted">
                  {new Date(p.submittedAt).toLocaleString("es-ES")}
                </span>
              </summary>
              <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-xs">
                {units.map((unit) => (
                  <p key={unit.id} className="text-muted">
                    <span className="text-foreground">{unit.name}</span>:{" "}
                    {(p.byUnit.get(unit.id) ?? []).join(", ") || "—"}
                  </p>
                ))}
                {p.unassigned.length > 0 && (
                  <p className="text-muted">
                    <span className="text-foreground">Sin asignar</span>:{" "}
                    {p.unassigned.join(", ")}
                  </p>
                )}
              </div>
            </details>
          ))}
          {proposals.length === 0 && (
            <p className="p-4 text-sm text-muted">Todavía no ha llegado ninguna propuesta.</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted">Pendientes de responder</h2>
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {pending.map((s) => (
            <li key={s.id} className="flex items-center justify-between p-3 text-sm">
              <span className="text-foreground">{s.name}</span>
              <span className="text-xs text-muted">
                {registeredIds.has(s.id) ? "registrado, sin responder" : "sin registrar"}
              </span>
            </li>
          ))}
          {pending.length === 0 && (
            <li className="p-3 text-sm text-muted">Todo el mundo ha respondido.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
