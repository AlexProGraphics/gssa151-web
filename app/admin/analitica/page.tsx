import { redirect } from "next/navigation";
import { dbAll } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminAnalyticsTable, type AnalyticsRow, type AnalyticsMetrics } from "@/components/AdminAnalyticsTable";
import { computeSurveyTotalBudget } from "@/lib/surveyBudget";
import {
  CAMP_AVAILABILITY_LABEL,
  CARGO_LABEL,
  COMISION_LABEL,
  SURVEY_MTL_LABEL,
  SURVEY_VETO_COST,
  UNIT_CONTINUITY_LABEL,
  type CampAvailability,
  type CargoRole,
  type ComisionRole,
  type MtlStatus,
  type PriorityPref,
  type SurveyMtlStatus,
  type UnitContinuity,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const MTL_ADMIN_LABEL: Record<MtlStatus, string> = {
  SI: "Sí",
  NO: "No",
  EN_CURSO: "En curso",
  NO_SE: "No se sabe",
};

export default async function AdminAnaliticaPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login?next=/admin/analitica");

  const [
    scouterRows,
    scoreRows,
    unitRows,
    assignmentRows,
    registeredRows,
    adminRows,
    surveyRows,
    roleRows,
    compatRows,
    proposalRows,
  ] = await Promise.all([
    dbAll<{ id: string; name: string; active: number }>(
      "SELECT id, name, active FROM scouters ORDER BY name",
    ),
    dbAll<{
      scouter_id: string;
      birth_year: number | null;
      mtl_status: MtlStatus | null;
      total_experience_years: number | null;
      confianza: number | null;
      lider_score: number | null;
    }>("SELECT * FROM scouter_scores"),
    dbAll<{ id: string; name: string; category: string }>(
      "SELECT id, name, category FROM units ORDER BY sort_order",
    ),
    dbAll<{ scouterId: string; unitId: string }>(
      "SELECT scouter_id AS scouterId, unit_id AS unitId FROM assignments",
    ),
    dbAll<{ scouter_id: string }>("SELECT scouter_id FROM scouter_users"),
    dbAll<{ scouter_id: string }>("SELECT scouter_id FROM admin_users"),
    dbAll<{
      scouterId: string;
      priorityPref: PriorityPref | null;
      availability: string | null;
      freeText: string | null;
      availNavidad: CampAvailability;
      availSemanaSanta: CampAvailability;
      availVerano: CampAvailability;
      mtlSelfStatus: SurveyMtlStatus | null;
      castores: number | null;
      lobatos: number | null;
      tropa: number | null;
      escultas: number | null;
      clan: number | null;
      previousUnitId: string | null;
      yearsInUnit: number | null;
      unitContinuity: UnitContinuity | null;
      branchPriorityOrder: string | null;
      submittedAt: string;
    }>(
      `SELECT scouter_id AS scouterId, priority_pref AS priorityPref, availability, free_text AS freeText,
              avail_navidad AS availNavidad, avail_semana_santa AS availSemanaSanta,
              avail_verano AS availVerano, mtl_self_status AS mtlSelfStatus,
              pref_castores AS castores, pref_lobatos AS lobatos, pref_tropa AS tropa,
              pref_escultas AS escultas, pref_clan AS clan, previous_unit_id AS previousUnitId,
              years_in_unit AS yearsInUnit, unit_continuity AS unitContinuity,
              branch_priority_order AS branchPriorityOrder, submitted_at AS submittedAt
       FROM survey_responses WHERE source = 'web'`,
    ),
    dbAll<{ scouterId: string; roleType: "cargo" | "comision"; roleName: string }>(
      "SELECT scouter_id AS scouterId, role_type AS roleType, role_name AS roleName FROM survey_roles",
    ),
    dbAll<{ scouterId: string; otherId: string; type: "compatible" | "exclusion" | "favorito" }>(
      "SELECT scouter_id AS scouterId, other_scouter_id AS otherId, type FROM survey_compatibility",
    ),
    dbAll<{ id: string; ownerId: string; submittedAt: string }>(
      "SELECT id, owner_id AS ownerId, submitted_at AS submittedAt FROM proposals",
    ),
  ]);

  // Las filas de libsql no son objetos planos — hay que reconstruirlas a
  // mano antes de pasarlas a un Client Component (ver SiteHeader.tsx, que
  // ya tuvo que hacer lo mismo con los scouters).
  const units = unitRows.map((u) => ({ id: u.id, name: u.name, category: u.category }));

  const nameById = new Map(scouterRows.map((s) => [s.id, s.name]));
  const unitById = new Map(units.map((u) => [u.id, u]));
  const scoreByScouter = new Map(scoreRows.map((s) => [s.scouter_id, s]));
  const unitByScouter = new Map(assignmentRows.map((a) => [a.scouterId, a.unitId]));
  const registeredIds = new Set(registeredRows.map((r) => r.scouter_id));
  const adminIds = new Set(adminRows.map((r) => r.scouter_id));
  const surveyByScouter = new Map(surveyRows.map((r) => [r.scouterId, r]));

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

  const compatByScouter = new Map<string, string[]>();
  const exclusionByScouter = new Map<string, string[]>();
  const favoriteByScouter = new Map<string, string[]>();
  for (const row of compatRows) {
    const target =
      row.type === "compatible"
        ? compatByScouter
        : row.type === "favorito"
          ? favoriteByScouter
          : exclusionByScouter;
    const list = target.get(row.scouterId) ?? [];
    list.push(nameById.get(row.otherId) ?? row.otherId);
    target.set(row.scouterId, list);
  }

  const proposalsByOwner = new Map<string, { count: number; lastAt: string }>();
  for (const p of proposalRows) {
    const entry = proposalsByOwner.get(p.ownerId) ?? { count: 0, lastAt: p.submittedAt };
    entry.count += 1;
    if (p.submittedAt > entry.lastAt) entry.lastAt = p.submittedAt;
    proposalsByOwner.set(p.ownerId, entry);
  }

  const rows: AnalyticsRow[] = scouterRows.map((s) => {
    const score = scoreByScouter.get(s.id);
    const survey = surveyByScouter.get(s.id);
    const unitId = unitByScouter.get(s.id);
    const unit = unitId ? unitById.get(unitId) : undefined;
    const cargos = cargosByScouter.get(s.id) ?? [];
    const comisiones = comisionesByScouter.get(s.id) ?? [];
    const vetoCount = (exclusionByScouter.get(s.id) ?? []).length;
    const proposal = proposalsByOwner.get(s.id);

    let totalBudget: number | null = null;
    let spentOnBranches: number | null = null;
    let budgetRemaining: number | null = null;
    if (survey) {
      totalBudget = computeSurveyTotalBudget({
        cargoCount: cargos.length,
        comisionCount: comisiones.length,
        availNavidad: survey.availNavidad,
        availSemanaSanta: survey.availSemanaSanta,
        availVerano: survey.availVerano,
        mtlSelfStatus: survey.mtlSelfStatus,
      });
      spentOnBranches =
        (survey.castores ?? 0) +
        (survey.lobatos ?? 0) +
        (survey.tropa ?? 0) +
        (survey.escultas ?? 0) +
        (survey.clan ?? 0);
      budgetRemaining = totalBudget - spentOnBranches - vetoCount * SURVEY_VETO_COST;
    }

    const previousUnitId = survey?.previousUnitId ?? null;
    const previousUnit = previousUnitId ? unitById.get(previousUnitId) : undefined;
    const branchPriorityOrder = survey?.branchPriorityOrder
      ? survey.branchPriorityOrder.split(",")
      : null;

    return {
      id: s.id,
      name: s.name,
      active: s.active === 1,
      isAdmin: adminIds.has(s.id),
      registered: registeredIds.has(s.id),
      unitName: unit?.name ?? null,
      unitCategory: unit?.category ?? null,
      surveyResponded: Boolean(survey),
      surveySubmittedAt: survey?.submittedAt ?? null,
      priorityPref: survey?.priorityPref ?? null,
      availNavidadLabel: survey ? CAMP_AVAILABILITY_LABEL[survey.availNavidad] : null,
      availSemanaSantaLabel: survey ? CAMP_AVAILABILITY_LABEL[survey.availSemanaSanta] : null,
      availVeranoLabel: survey ? CAMP_AVAILABILITY_LABEL[survey.availVerano] : null,
      mtlSelfLabel: survey?.mtlSelfStatus ? SURVEY_MTL_LABEL[survey.mtlSelfStatus] : null,
      cargos,
      comisiones,
      totalBudget,
      spentOnBranches,
      vetoCount,
      budgetRemaining,
      compatibles: compatByScouter.get(s.id) ?? [],
      incompatibles: exclusionByScouter.get(s.id) ?? [],
      favoritos: favoriteByScouter.get(s.id) ?? [],
      previousUnitName: previousUnit?.name ?? null,
      yearsInUnit: survey?.yearsInUnit ?? null,
      unitContinuityLabel: survey?.unitContinuity ? UNIT_CONTINUITY_LABEL[survey.unitContinuity] : null,
      branchPriorityOrder,
      birthYear: score?.birth_year ?? null,
      mtlAdminLabel: score?.mtl_status ? MTL_ADMIN_LABEL[score.mtl_status] : null,
      totalExperienceYears: score?.total_experience_years ?? null,
      confianza: score?.confianza ?? null,
      liderScore: score?.lider_score ?? null,
      proposalsCount: proposal?.count ?? 0,
      lastProposalAt: proposal?.lastAt ?? null,
    };
  });

  const activeRows = rows.filter((r) => r.active);
  const respondedCount = activeRows.filter((r) => r.surveyResponded).length;
  const registeredCount = activeRows.filter((r) => r.registered).length;
  const assignedCount = activeRows.filter((r) => r.unitName).length;
  const scoutersWithProposal = activeRows.filter((r) => r.proposalsCount > 0).length;
  const mtlYesCount = activeRows.filter((r) => r.mtlSelfLabel === SURVEY_MTL_LABEL.si).length;
  const confianzaValues = activeRows.map((r) => r.confianza).filter((v): v is number => v !== null);
  const liderValues = activeRows.map((r) => r.liderScore).filter((v): v is number => v !== null);
  const avg = (values: number[]) =>
    values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;

  const metrics: AnalyticsMetrics = {
    totalActive: activeRows.length,
    respondedCount,
    registeredCount,
    proposalsTotal: proposalRows.length,
    scoutersWithProposal,
    assignedCount,
    mtlYesCount,
    totalVetoes: activeRows.reduce((sum, r) => sum + r.vetoCount, 0),
    avgConfianza: avg(confianzaValues),
    avgLider: avg(liderValues),
  };

  return (
    <main className="mx-auto flex max-w-[1400px] flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analítica</h1>
        <p className="text-sm text-muted">
          Vista consolidada de encuesta, propuestas y datos confidenciales de
          la coordinación — solo aquí. Filtra, ordena y analiza a los{" "}
          {activeRows.length} scouters activos.
        </p>
      </div>
      <AdminAnalyticsTable rows={rows} metrics={metrics} units={units} />
    </main>
  );
}
