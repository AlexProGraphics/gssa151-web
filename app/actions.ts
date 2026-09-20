"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { dbAll, dbGet, dbRun } from "@/lib/db";
import {
  SESSION_COOKIE,
  adminSetScouterPassword,
  createSession,
  deleteSession,
  findAdminByScouterId,
  findScouterAccount,
  registerScouterAccount,
  requireAdmin,
  requireScouter,
  verifyPassword,
} from "@/lib/auth";
import { generateSuggestion, type ExclusionPair, type ScoringInput } from "@/lib/scoring";
import { computeSurveyTotalBudget } from "@/lib/surveyBudget";
import {
  AGILE_PAG_AMBITOS,
  BRANCHES,
  CAMP_FIELD_NAME,
  CAMP_SEASONS,
  CARGO_ROLES,
  COMISION_ROLES,
  FAVORITES_MAX,
  SURVEY_SUBMIT_UNLOCK_AT,
  SURVEY_VETO_COST,
  type AgileReferenceLink,
  type Branch,
  type CampAvailability,
  type CampSeason,
  type SurveyMtlStatus,
  type UnitCategory,
  type UnitContinuity,
} from "@/lib/types";

/**
 * Login único para todo el mundo (el desplegable lista a los 33, admins
 * incluidos): una sola sesión de scouter para cada persona. Si el nombre
 * elegido es uno de los dos admins fijos, su contraseña es la fija de
 * admin (no se auto-registra con ninguna otra) — el resto entra con la
 * contraseña que fijó la primera vez que reclamó su identidad, o la fija
 * si es la primera vez. "Ser admin" no crea una sesión aparte: es la misma
 * sesión de scouter, con permisos extra que se comprueban después (ver
 * getCurrentAdmin en lib/auth.ts).
 */
export async function unifiedLogin(formData: FormData) {
  const scouterId = String(formData.get("scouterId") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!scouterId || !password) {
    redirect(`${next}?loginError=missing`);
  }

  const scouter = await dbGet<{ id: string }>(
    "SELECT id FROM scouters WHERE id = ? AND active = 1",
    [scouterId],
  );
  if (!scouter) {
    redirect(`${next}?loginError=invalid`);
  }

  // Las identidades de admin tienen una contraseña fija (ver
  // ensureFixedAdmins) — nunca pasan por el registro/verificación de
  // scouter normal, para que nadie pueda "reclamar" a Gabi o Alex Muñoz
  // con una contraseña propia.
  const admin = await findAdminByScouterId(scouterId);
  if (admin) {
    if (!verifyPassword(password, admin.passwordHash)) {
      redirect(`${next}?loginError=wrong`);
    }
  } else {
    const account = await findScouterAccount(scouterId);
    if (!account) {
      if (password.length < 6) {
        redirect(`${next}?loginError=short`);
      }
      if (password !== confirmPassword) {
        redirect(`${next}?loginError=mismatch`);
      }
      await registerScouterAccount(scouterId, password);
    } else if (!verifyPassword(password, account.passwordHash)) {
      redirect(`${next}?loginError=wrong`);
    }
  }

  const token = await createSession(scouterId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(next);
}

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  cookieStore.delete(SESSION_COOKIE);
  redirect("/");
}

export async function moveScouter(scouterId: string, unitId: string) {
  const admin = await requireAdmin();

  await dbRun(
    `INSERT INTO assignments (scouter_id, unit_id, assigned_by, assigned_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(scouter_id) DO UPDATE SET
       unit_id = excluded.unit_id,
       assigned_by = excluded.assigned_by,
       assigned_at = excluded.assigned_at`,
    [scouterId, unitId, admin.id],
  );

  revalidatePath("/parrillas");
  revalidatePath("/admin/board");
}

export async function unassignScouter(scouterId: string) {
  await requireAdmin();
  await dbRun("DELETE FROM assignments WHERE scouter_id = ?", [scouterId]);

  revalidatePath("/parrillas");
  revalidatePath("/admin/board");
}

/** "Crea tu parrilla": borrador personal de un scouter, nunca toca `assignments`. */
export async function moveInProposal(scouterId: string, unitId: string) {
  const owner = await requireScouter();

  await dbRun(
    `INSERT INTO proposal_draft_assignments (owner_id, scouter_id, unit_id, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(owner_id, scouter_id) DO UPDATE SET
       unit_id = excluded.unit_id,
       updated_at = excluded.updated_at`,
    [owner.scouterId, scouterId, unitId],
  );

  revalidatePath("/mi-parrilla");
}

export async function unassignInProposal(scouterId: string) {
  const owner = await requireScouter();
  await dbRun("DELETE FROM proposal_draft_assignments WHERE owner_id = ? AND scouter_id = ?", [
    owner.scouterId,
    scouterId,
  ]);

  revalidatePath("/mi-parrilla");
}

/** Compara el borrador actual contra la última propuesta ya enviada — si son
 * idénticos no hay nada nuevo que mandar (ver submitProposal). */
async function draftMatchesLatestProposal(ownerId: string): Promise<boolean> {
  const latest = await dbGet<{ id: string }>(
    "SELECT id FROM proposals WHERE owner_id = ? ORDER BY submitted_at DESC LIMIT 1",
    [ownerId],
  );
  if (!latest) return false;

  const [draft, sent] = await Promise.all([
    dbAll<{ scouterId: string; unitId: string }>(
      "SELECT scouter_id AS scouterId, unit_id AS unitId FROM proposal_draft_assignments WHERE owner_id = ?",
      [ownerId],
    ),
    dbAll<{ scouterId: string; unitId: string }>(
      "SELECT scouter_id AS scouterId, unit_id AS unitId FROM proposal_assignments WHERE proposal_id = ?",
      [latest.id],
    ),
  ]);

  if (draft.length !== sent.length) return false;
  const sentByScouter = new Map(sent.map((r) => [r.scouterId, r.unitId]));
  return draft.every((r) => sentByScouter.get(r.scouterId) === r.unitId);
}

/** Congela el borrador actual como un nuevo envío — se acumulan, no se pisan. */
export async function submitProposal() {
  const owner = await requireScouter();

  // Si el borrador es exactamente igual al último envío, no crear un
  // duplicado — el botón del cliente ya se deshabilita en ese caso, esto es
  // el mismo candado que submitSurvey tiene para su propio bloqueo.
  if (await draftMatchesLatestProposal(owner.scouterId)) {
    redirect("/mi-parrilla?error=already_sent");
  }

  const draft = await dbAll<{ scouterId: string; unitId: string }>(
    "SELECT scouter_id AS scouterId, unit_id AS unitId FROM proposal_draft_assignments WHERE owner_id = ?",
    [owner.scouterId],
  );

  const proposalId = crypto.randomUUID();
  await dbRun("INSERT INTO proposals (id, owner_id) VALUES (?, ?)", [proposalId, owner.scouterId]);
  for (const row of draft) {
    await dbRun("INSERT INTO proposal_assignments (proposal_id, scouter_id, unit_id) VALUES (?, ?, ?)", [
      proposalId,
      row.scouterId,
      row.unitId,
    ]);
  }

  revalidatePath("/admin/respuestas");
  redirect("/mi-parrilla?sent=1");
}

export async function generateBoardSuggestion() {
  const admin = await requireAdmin();

  const scouterRows = await dbAll<{ id: string }>("SELECT id FROM scouters WHERE active = 1");

  const scoreRows = await dbAll<{
    scouterId: string;
    mtlStatus: string | null;
    confianza: number | null;
    liderScore: number | null;
  }>(
    "SELECT scouter_id AS scouterId, mtl_status AS mtlStatus, confianza, lider_score AS liderScore FROM scouter_scores",
  );

  const experienceRows = await dbAll<{ scouterId: string; branch: Branch; years: number }>(
    "SELECT scouter_id AS scouterId, branch, years FROM scouter_branch_experience",
  );

  // pref_* significa cosas distintas según el origen: 'seed' son las
  // puntuaciones 1-5 del Excel original; 'web' son puntos repartidos de un
  // presupuesto de 100 (ver PointsBudgetFields). Se normalizan aquí a la
  // misma escala ~0-5 que espera scoreForUnit, dividiendo por 20 solo las
  // de origen 'web'.
  const prefRowsRaw = await dbAll<{
    scouterId: string;
    castores: number | null;
    lobatos: number | null;
    tropa: number | null;
    escultas: number | null;
    clan: number | null;
    source: string;
  }>(
    `SELECT scouter_id AS scouterId, pref_castores AS castores, pref_lobatos AS lobatos,
            pref_tropa AS tropa, pref_escultas AS escultas, pref_clan AS clan, source
     FROM survey_responses`,
  );
  const prefRows = prefRowsRaw.map((r) => {
    const scale = r.source === "web" ? 1 / 20 : 1;
    return {
      scouterId: r.scouterId,
      castores: r.castores !== null ? r.castores * scale : null,
      lobatos: r.lobatos !== null ? r.lobatos * scale : null,
      tropa: r.tropa !== null ? r.tropa * scale : null,
      escultas: r.escultas !== null ? r.escultas * scale : null,
      clan: r.clan !== null ? r.clan * scale : null,
    };
  });

  const exclusionRows = await dbAll<{ a: string; b: string }>(
    "SELECT scouter_id AS a, other_scouter_id AS b FROM survey_compatibility WHERE type = 'exclusion'",
  );

  const unitRows = await dbAll<{ id: string; category: UnitCategory }>(
    "SELECT id, category FROM units",
  );

  const assignmentRows = await dbAll<{ scouterId: string; unitId: string }>(
    "SELECT scouter_id AS scouterId, unit_id AS unitId FROM assignments",
  );

  const scoreByScouter = new Map(scoreRows.map((r) => [r.scouterId, r]));
  const experienceByScouter = new Map<string, Partial<Record<Branch, number>>>();
  for (const row of experienceRows) {
    const entry = experienceByScouter.get(row.scouterId) ?? {};
    entry[row.branch] = row.years;
    experienceByScouter.set(row.scouterId, entry);
  }
  const prefByScouter = new Map(prefRows.map((r) => [r.scouterId, r]));

  const scouters: ScoringInput[] = scouterRows.map((s) => {
    const score = scoreByScouter.get(s.id);
    const pref = prefByScouter.get(s.id);
    return {
      scouterId: s.id,
      mtlStatus: score?.mtlStatus ?? null,
      confianza: score?.confianza ?? null,
      liderScore: score?.liderScore ?? null,
      branchExperience: experienceByScouter.get(s.id) ?? {},
      preference: pref
        ? {
            castores: pref.castores ?? undefined,
            lobatos: pref.lobatos ?? undefined,
            tropa: pref.tropa ?? undefined,
            escultas: pref.escultas ?? undefined,
            clan: pref.clan ?? undefined,
          }
        : {},
    };
  });

  const existingAssignments = Object.fromEntries(
    assignmentRows.map((a) => [a.scouterId, a.unitId]),
  );

  const exclusions: ExclusionPair[] = exclusionRows.map((e) => ({ a: e.a, b: e.b }));

  const suggestion = generateSuggestion({
    scouters,
    units: unitRows,
    existingAssignments,
    exclusions,
  });

  const newlyAssigned = Object.entries(suggestion).filter(
    ([scouterId, unitId]) => existingAssignments[scouterId] !== unitId,
  );

  for (const [scouterId, unitId] of newlyAssigned) {
    await dbRun(
      `INSERT INTO assignments (scouter_id, unit_id, assigned_by, assigned_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(scouter_id) DO UPDATE SET
         unit_id = excluded.unit_id,
         assigned_by = excluded.assigned_by,
         assigned_at = excluded.assigned_at`,
      [scouterId, unitId, admin.id],
    );
  }

  revalidatePath("/parrillas");
  revalidatePath("/admin/board");

  return { placed: newlyAssigned.length };
}

export async function submitSurvey(formData: FormData) {
  const { scouterId } = await requireScouter();

  // Mientras se sigue ajustando el sistema de budget, el envío real queda
  // bloqueado en servidor hasta SURVEY_SUBMIT_UNLOCK_AT — el botón del
  // cliente ya lo deshabilita, pero esto es lo que de verdad lo impide si
  // alguien se lo salta a mano.
  if (Date.now() < new Date(SURVEY_SUBMIT_UNLOCK_AT).getTime()) {
    redirect("/encuesta?error=locked");
  }

  const priorityPref = formData.get("priorityPref");
  const availability = String(formData.get("availability") ?? "").trim() || null;
  const freeText = String(formData.get("freeText") ?? "").trim() || null;
  const mtlSelfStatus = String(formData.get("mtlSelfStatus") ?? "").trim() || null;
  const rolesText = String(formData.get("rolesText") ?? "").trim() || null;
  const previousUnitId = String(formData.get("previousUnitId") ?? "").trim() || null;
  const yearsInUnitRaw = formData.get("yearsInUnit");
  const yearsInUnit =
    yearsInUnitRaw === null || yearsInUnitRaw === "" ? null : Number(yearsInUnitRaw) || 0;
  const unitContinuityRaw = String(formData.get("unitContinuity") ?? "");
  const unitContinuity: UnitContinuity | null =
    unitContinuityRaw === "mantener" || unitContinuityRaw === "cambiar" ? unitContinuityRaw : null;

  // Disponibilidad de campamentos: 'si' | 'parcial' | 'no', un valor
  // manipulado o ausente se trata como 'no' (sin puntos).
  const campAvailSet = new Set<string>(["si", "parcial", "no"]);
  const campAvail = {} as Record<CampSeason, CampAvailability>;
  for (const season of CAMP_SEASONS) {
    const raw = String(formData.get(CAMP_FIELD_NAME[season]) ?? "");
    campAvail[season] = (campAvailSet.has(raw) ? raw : "no") as CampAvailability;
  }

  // Orden de prioridad de secciones: solo se guarda si es una permutación
  // válida de las 5 secciones — si no, se descarta (es informativo, no
  // bloquea el envío).
  const branchSet = new Set<string>(BRANCHES);
  const branchPriorityRaw = String(formData.get("branchPriorityOrder") ?? "")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);
  const branchPriorityOrder =
    branchPriorityRaw.length === BRANCHES.length &&
    new Set(branchPriorityRaw).size === BRANCHES.length &&
    branchPriorityRaw.every((b) => branchSet.has(b))
      ? branchPriorityRaw.join(",")
      : null;

  // Cargos/comisiones/disponibilidad de campamentos/título MTL AMPLÍAN el
  // budget (nunca lo reducen) — cada uno solo cuenta si es uno de los
  // válidos, para no dejar que un valor manipulado en el formulario infle
  // el budget de mentira.
  const cargoSet = new Set<string>(CARGO_ROLES);
  const comisionSet = new Set<string>(COMISION_ROLES);
  const cargoIds = formData.getAll("cargos").map(String).filter((id) => cargoSet.has(id));
  const comisionIds = formData
    .getAll("comisiones")
    .map(String)
    .filter((id) => comisionSet.has(id));
  const totalBudget = computeSurveyTotalBudget({
    cargoCount: cargoIds.length,
    comisionCount: comisionIds.length,
    availNavidad: campAvail.navidad,
    availSemanaSanta: campAvail.semana_santa,
    availVerano: campAvail.verano,
    mtlSelfStatus: mtlSelfStatus as SurveyMtlStatus | null,
  });

  // Puntos por sección: presupuesto compartido con los vetos.
  const pref: Record<Branch, number> = {} as Record<Branch, number>;
  for (const branch of BRANCHES) {
    const raw = Number(formData.get(`pref_${branch}`) ?? 0) || 0;
    pref[branch] = Math.min(totalBudget, Math.max(0, Math.round(raw)));
  }

  const excludeIds = formData.getAll("excludeWith").map(String);
  const totalSpent =
    BRANCHES.reduce((sum, b) => sum + pref[b], 0) + excludeIds.length * SURVEY_VETO_COST;
  if (totalSpent > totalBudget) {
    redirect("/encuesta?error=budget_exceeded");
  }

  // Como mucho FAVORITES_MAX favoritos — el cliente ya lo limita, esto es el
  // mismo candado por si alguien manda el formulario a mano.
  const favoriteIds = formData.getAll("favoriteWith").map(String).slice(0, FAVORITES_MAX);

  // Si la base de datos no puede escribir (disco lleno, fichero bloqueado…)
  // que quede claro que NO se ha guardado nada, en vez de un error genérico.
  try {
    await dbRun(
      `INSERT INTO survey_responses
        (scouter_id, priority_pref, availability, free_text, avail_navidad, avail_semana_santa,
         avail_verano, mtl_self_status, roles_text, pref_castores, pref_lobatos, pref_tropa, pref_escultas, pref_clan,
         previous_unit_id, years_in_unit, unit_continuity, branch_priority_order, source, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'web', datetime('now'))
       ON CONFLICT(scouter_id) DO UPDATE SET
         priority_pref = excluded.priority_pref,
         availability = excluded.availability,
         free_text = excluded.free_text,
         avail_navidad = excluded.avail_navidad,
         avail_semana_santa = excluded.avail_semana_santa,
         avail_verano = excluded.avail_verano,
         mtl_self_status = excluded.mtl_self_status,
         roles_text = excluded.roles_text,
         pref_castores = excluded.pref_castores,
         pref_lobatos = excluded.pref_lobatos,
         pref_tropa = excluded.pref_tropa,
         pref_escultas = excluded.pref_escultas,
         pref_clan = excluded.pref_clan,
         previous_unit_id = excluded.previous_unit_id,
         years_in_unit = excluded.years_in_unit,
         unit_continuity = excluded.unit_continuity,
         branch_priority_order = excluded.branch_priority_order,
         source = excluded.source,
         submitted_at = excluded.submitted_at`,
      [
        scouterId,
        (priorityPref as string) || null,
        availability,
        freeText,
        campAvail.navidad,
        campAvail.semana_santa,
        campAvail.verano,
        mtlSelfStatus,
        rolesText,
        pref.castores,
        pref.lobatos,
        pref.tropa,
        pref.escultas,
        pref.clan,
        previousUnitId,
        yearsInUnit,
        unitContinuity,
        branchPriorityOrder,
      ],
    );

    await dbRun("DELETE FROM survey_roles WHERE scouter_id = ?", [scouterId]);
    for (const roleName of cargoIds) {
      await dbRun("INSERT INTO survey_roles (scouter_id, role_type, role_name) VALUES (?, ?, ?)", [
        scouterId,
        "cargo",
        roleName,
      ]);
    }
    for (const roleName of comisionIds) {
      await dbRun("INSERT INTO survey_roles (scouter_id, role_type, role_name) VALUES (?, ?, ?)", [
        scouterId,
        "comision",
        roleName,
      ]);
    }

    await dbRun("DELETE FROM survey_compatibility WHERE scouter_id = ?", [scouterId]);

    for (const otherId of formData.getAll("compatibleWith").map(String)) {
      await dbRun(
        "INSERT INTO survey_compatibility (scouter_id, other_scouter_id, type) VALUES (?, ?, ?)",
        [scouterId, otherId, "compatible"],
      );
    }
    for (const otherId of excludeIds) {
      await dbRun(
        "INSERT INTO survey_compatibility (scouter_id, other_scouter_id, type) VALUES (?, ?, ?)",
        [scouterId, otherId, "exclusion"],
      );
    }
    for (const otherId of favoriteIds) {
      await dbRun(
        "INSERT INTO survey_compatibility (scouter_id, other_scouter_id, type) VALUES (?, ?, ?)",
        [scouterId, otherId, "favorito"],
      );
    }
  } catch (err) {
    console.error("submitSurvey: fallo al guardar en la base de datos", err);
    redirect("/encuesta?error=save_failed");
  }

  redirect("/encuesta?ok=1");
}

export async function upsertScouterScore(formData: FormData) {
  await requireAdmin();

  const scouterId = String(formData.get("scouterId") ?? "");
  if (!scouterId) throw new Error("Falta el scouter.");

  const toNullableNumber = (key: string) => {
    const raw = formData.get(key);
    return raw === null || raw === "" ? null : Number(raw);
  };

  await dbRun(
    `INSERT INTO scouter_scores (scouter_id, birth_year, mtl_status, total_experience_years, confianza, lider_score)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(scouter_id) DO UPDATE SET
       birth_year = excluded.birth_year,
       mtl_status = excluded.mtl_status,
       total_experience_years = excluded.total_experience_years,
       confianza = excluded.confianza,
       lider_score = excluded.lider_score`,
    [
      scouterId,
      toNullableNumber("birthYear"),
      (formData.get("mtlStatus") as string) || null,
      toNullableNumber("totalExperienceYears"),
      toNullableNumber("confianza"),
      toNullableNumber("liderScore"),
    ],
  );

  revalidatePath("/admin/scouters");
}

export async function addScouter(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Falta el nombre.");

  await dbRun("INSERT INTO scouters (id, name) VALUES (?, ?)", [crypto.randomUUID(), name]);

  revalidatePath("/admin/scouters");
}

/** Oculta (o vuelve a mostrar) un scouter para todo el mundo salvo los
 * admins: `active` ya es el filtro que usan parrillas/encuesta/login, así
 * que apagarlo basta y es reversible — a diferencia de borrarlo. */
export async function setScouterHidden(formData: FormData) {
  await requireAdmin();

  const scouterId = String(formData.get("scouterId") ?? "");
  const hidden = formData.get("hidden") === "1";
  if (!scouterId) throw new Error("Falta el scouter.");

  if (hidden && (await findAdminByScouterId(scouterId))) {
    throw new Error("No se puede ocultar a un admin.");
  }

  await dbRun("UPDATE scouters SET active = ? WHERE id = ?", [hidden ? 0 : 1, scouterId]);

  revalidatePath("/admin/scouters");
  revalidatePath("/admin/board");
  revalidatePath("/admin/respuestas");
  revalidatePath("/admin/analitica");
  revalidatePath("/parrillas");
  revalidatePath("/mi-parrilla");
}

/** Borrado real y permanente — arrastra en cascada su encuesta, propuestas,
 * asignaciones y cuenta (ver ON DELETE CASCADE en lib/db.ts). Para dejar
 * de mostrarlo sin perder sus datos, usar setScouterHidden en su lugar. */
export async function deleteScouter(formData: FormData) {
  await requireAdmin();

  const scouterId = String(formData.get("scouterId") ?? "");
  if (!scouterId) throw new Error("Falta el scouter.");

  if (await findAdminByScouterId(scouterId)) {
    throw new Error("No se puede eliminar a un admin.");
  }

  await dbRun("DELETE FROM scouters WHERE id = ?", [scouterId]);

  revalidatePath("/admin/scouters");
  revalidatePath("/admin/board");
  revalidatePath("/admin/respuestas");
  revalidatePath("/admin/analitica");
  revalidatePath("/parrillas");
  revalidatePath("/mi-parrilla");
}

/** Único desbloqueo posible si un scouter olvida su contraseña: un admin se la fuerza. */
export async function adminResetScouterPassword(formData: FormData) {
  await requireAdmin();

  const scouterId = String(formData.get("scouterId") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  if (!scouterId || newPassword.length < 6) {
    throw new Error("Falta el scouter o la contraseña es demasiado corta (mínimo 6).");
  }

  await adminSetScouterPassword(scouterId, newPassword);

  revalidatePath("/admin/scouters");
}

// --- Consejos AGILE ---

/** "Título con acentos y ñ" -> "titulo-con-acentos-y-n" — id legible y
 * único para la URL de cada consejo (ver createAgileCouncil). */
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Admin: crea un nuevo consejo AGILE — el resto de la web (formulario de
 * participación, disclaimer de respuestas públicas) lo reusa automáticamente
 * vía /consejos-agile/[slug], sin tocar código para cada consejo nuevo. */
export async function createAgileCouncil(formData: FormData) {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Falta el título del consejo.");

  const eventDate = String(formData.get("eventDate") ?? "").trim() || null;
  const methodologyLink = String(formData.get("methodologyLink") ?? "").trim() || null;
  const calendarLink = String(formData.get("calendarLink") ?? "").trim() || null;
  const calendarDriveLink = String(formData.get("calendarDriveLink") ?? "").trim() || null;
  const chavalesExcelLink = String(formData.get("chavalesExcelLink") ?? "").trim() || null;

  // Un enlace por línea, formato "Etiqueta | URL" — una línea mal escrita se
  // descarta sola en vez de romper el envío entero.
  const pagLinksRaw = String(formData.get("pagReferenceLinks") ?? "");
  const pagReferenceLinks: AgileReferenceLink[] = pagLinksRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split("|").map((part) => part.trim());
      return label && url ? { label, url } : null;
    })
    .filter((link): link is AgileReferenceLink => link !== null);

  let slug = slugify(title) || crypto.randomUUID();
  const existing = await dbGet<{ id: string }>("SELECT id FROM agile_councils WHERE slug = ?", [
    slug,
  ]);
  if (existing) slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`;

  const maxSortRow = await dbGet<{ maxSort: number | null }>(
    "SELECT MAX(sort_order) AS maxSort FROM agile_councils",
  );

  await dbRun(
    `INSERT INTO agile_councils
      (id, slug, title, event_date, methodology_link, calendar_link, calendar_drive_link, chavales_excel_link, pag_reference_links, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      slug,
      title,
      eventDate,
      methodologyLink,
      calendarLink,
      calendarDriveLink,
      chavalesExcelLink,
      JSON.stringify(pagReferenceLinks),
      (maxSortRow?.maxSort ?? -1) + 1,
    ],
  );

  revalidatePath("/consejos-agile");
  revalidatePath("/admin/consejos-agile");
}

/** Admin: oculta (o vuelve a mostrar) un consejo de la lista pública — igual
 * que setScouterHidden, reversible y sin perder las respuestas ya enviadas. */
export async function setAgileCouncilActive(formData: FormData) {
  await requireAdmin();

  const councilId = String(formData.get("councilId") ?? "");
  const active = formData.get("active") === "1";
  if (!councilId) throw new Error("Falta el consejo.");

  await dbRun("UPDATE agile_councils SET active = ? WHERE id = ?", [active ? 1 : 0, councilId]);

  revalidatePath("/consejos-agile");
  revalidatePath("/admin/consejos-agile");
}

/** Admin: borrado real — arrastra en cascada sus respuestas (ON DELETE CASCADE). */
export async function deleteAgileCouncil(formData: FormData) {
  await requireAdmin();

  const councilId = String(formData.get("councilId") ?? "");
  if (!councilId) throw new Error("Falta el consejo.");

  await dbRun("DELETE FROM agile_councils WHERE id = ?", [councilId]);

  revalidatePath("/consejos-agile");
  revalidatePath("/admin/consejos-agile");
}

/** Respuesta de participación en un consejo — pública para todo el kraal
 * (ver disclaimer en /consejos-agile/[slug]), a diferencia de submitSurvey.
 * Reenviarla la pisa (no se acumula), para poder corregirla. */
export async function submitAgileCouncilResponse(formData: FormData) {
  const { scouterId } = await requireScouter();

  const councilId = String(formData.get("councilId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!councilId || !slug) throw new Error("Falta el consejo.");

  const pag: Record<string, string | null> = {};
  for (const ambito of AGILE_PAG_AMBITOS) {
    pag[ambito] = String(formData.get(`pag_${ambito}`) ?? "").trim() || null;
  }

  const calendarReviewed = formData.get("calendarReviewed") === "1";
  const calendarComments = String(formData.get("calendarComments") ?? "").trim() || null;
  const chavalesExcelDone = formData.get("chavalesExcelDone") === "1";
  const chavalesComments = String(formData.get("chavalesComments") ?? "").trim() || null;
  const ruegosPreguntas = String(formData.get("ruegosPreguntas") ?? "").trim() || null;

  await dbRun(
    `INSERT INTO agile_council_responses
      (council_id, scouter_id, pag_social, pag_ambiental, pag_espiritual, pag_salud,
       calendar_reviewed, calendar_comments, chavales_excel_done, chavales_comments,
       ruegos_preguntas, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(council_id, scouter_id) DO UPDATE SET
       pag_social = excluded.pag_social,
       pag_ambiental = excluded.pag_ambiental,
       pag_espiritual = excluded.pag_espiritual,
       pag_salud = excluded.pag_salud,
       calendar_reviewed = excluded.calendar_reviewed,
       calendar_comments = excluded.calendar_comments,
       chavales_excel_done = excluded.chavales_excel_done,
       chavales_comments = excluded.chavales_comments,
       ruegos_preguntas = excluded.ruegos_preguntas,
       submitted_at = excluded.submitted_at`,
    [
      councilId,
      scouterId,
      pag.social,
      pag.ambiental,
      pag.espiritual,
      pag.salud,
      calendarReviewed ? 1 : 0,
      calendarComments,
      chavalesExcelDone ? 1 : 0,
      chavalesComments,
      ruegosPreguntas,
    ],
  );

  revalidatePath(`/consejos-agile/${slug}`);
  redirect(`/consejos-agile/${slug}?ok=1`);
}

// --- Moderación de turno de palabra (Consejos AGILE) ---

const AGILE_TURN_DURATIONS = [15, 30, 60];

/** Admin: añade a mano a alguien al panel de moderación. Si no respondió la
 * encuesta, el admin decide aquí mismo si entra "penalizado" (temporizador
 * fijo de 15s) o con las mismas condiciones que el resto. */
export async function addAgileModerationParticipant(formData: FormData) {
  await requireAdmin();

  const councilId = String(formData.get("councilId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const scouterId = String(formData.get("scouterId") ?? "");
  const penalized = formData.get("penalized") === "1";
  if (!councilId || !scouterId) throw new Error("Falta el consejo o la persona a añadir.");

  await dbRun(
    `INSERT INTO agile_moderation_participants (council_id, scouter_id, penalized, added_manually)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(council_id, scouter_id) DO UPDATE SET penalized = excluded.penalized`,
    [councilId, scouterId, penalized ? 1 : 0],
  );

  revalidatePath(`/admin/consejos-agile/${slug}/moderacion`);
}

/** Admin: quita a alguien del panel — borra también su historial de turnos
 * de este consejo, para no dejar tiempos huérfanos de quien ya no aparece. */
export async function removeAgileModerationParticipant(formData: FormData) {
  await requireAdmin();

  const councilId = String(formData.get("councilId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const scouterId = String(formData.get("scouterId") ?? "");
  if (!councilId || !scouterId) throw new Error("Falta el consejo o la persona.");

  await dbRun(
    "DELETE FROM agile_moderation_participants WHERE council_id = ? AND scouter_id = ?",
    [councilId, scouterId],
  );
  await dbRun(
    "DELETE FROM agile_moderation_interventions WHERE council_id = ? AND scouter_id = ?",
    [councilId, scouterId],
  );

  revalidatePath(`/admin/consejos-agile/${slug}/moderacion`);
}

/**
 * Admin: arranca el temporizador de turno de palabra de una persona. Solo
 * puede haber un turno "abierto" a la vez por consejo — si ya había uno (de
 * otra persona, o de una pestaña distinta), se cierra primero registrando
 * el tiempo real transcurrido, igual que si se hubiera pulsado "Detener".
 * No se llama directamente desde un <form>, sino desde el panel cliente
 * (onClick) para poder devolver el id/hora de inicio y arrancar la cuenta
 * atrás en el momento — por eso no lleva revalidatePath, el propio cliente
 * actualiza su estado local.
 */
export async function startAgileIntervention(
  councilId: string,
  scouterId: string,
  durationSeconds: number,
  agendaItemId: string | null,
): Promise<{ id: string; startedAt: string }> {
  await requireAdmin();
  if (!AGILE_TURN_DURATIONS.includes(durationSeconds)) {
    throw new Error("Duración de temporizador no válida.");
  }

  const open = await dbGet<{ id: string; startedAt: string }>(
    `SELECT id, started_at AS startedAt FROM agile_moderation_interventions
     WHERE council_id = ? AND ended_at IS NULL`,
    [councilId],
  );
  if (open) {
    const elapsed = Math.round((Date.now() - new Date(open.startedAt).getTime()) / 1000);
    await dbRun(
      "UPDATE agile_moderation_interventions SET ended_at = ?, elapsed_seconds = ? WHERE id = ?",
      [new Date().toISOString(), Math.max(0, elapsed), open.id],
    );
  }

  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  await dbRun(
    `INSERT INTO agile_moderation_interventions (id, council_id, scouter_id, duration_seconds, started_at, agenda_item_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, councilId, scouterId, durationSeconds, startedAt, agendaItemId],
  );

  return { id, startedAt };
}

/** Admin: cierra el turno en marcha (a mano, o porque se agotó el tiempo) y
 * registra el tiempo real hablado. Ver nota de startAgileIntervention sobre
 * por qué no lleva revalidatePath. */
export async function stopAgileIntervention(interventionId: string, elapsedSeconds: number) {
  await requireAdmin();

  await dbRun(
    `UPDATE agile_moderation_interventions
     SET ended_at = ?, elapsed_seconds = ?
     WHERE id = ? AND ended_at IS NULL`,
    [new Date().toISOString(), Math.max(0, Math.round(elapsedSeconds)), interventionId],
  );
}

// --- Orden del día del consejo (Consejos AGILE) ---

/**
 * Admin: marca un punto del orden del día como "en curso" — solo puede
 * haber uno activo a la vez por consejo, así que si había otro en marcha se
 * pausa antes (igual que startAgileIntervention con los turnos de palabra).
 * Llamada directa desde el panel cliente, no desde un <form>.
 */
export async function startAgendaItem(
  councilId: string,
  agendaItemId: string,
): Promise<{ startedAt: string }> {
  await requireAdmin();

  const running = await dbAll<{ id: string; startedAt: string }>(
    `SELECT id, started_at AS startedAt FROM agile_moderation_agenda_items
     WHERE council_id = ? AND started_at IS NOT NULL`,
    [councilId],
  );
  for (const item of running) {
    const delta = Math.round((Date.now() - new Date(item.startedAt).getTime()) / 1000);
    await dbRun(
      `UPDATE agile_moderation_agenda_items
       SET started_at = NULL, accumulated_seconds = accumulated_seconds + ?
       WHERE id = ?`,
      [Math.max(0, delta), item.id],
    );
  }

  const startedAt = new Date().toISOString();
  await dbRun(
    "UPDATE agile_moderation_agenda_items SET started_at = ? WHERE id = ? AND council_id = ?",
    [startedAt, agendaItemId, councilId],
  );

  return { startedAt };
}

/** Admin: pausa el punto en marcha, volcando el tiempo corrido a
 * accumulated_seconds. Ver nota de stopAgileIntervention sobre por qué no
 * lleva revalidatePath. */
export async function pauseAgendaItem(agendaItemId: string, elapsedDeltaSeconds: number) {
  await requireAdmin();

  await dbRun(
    `UPDATE agile_moderation_agenda_items
     SET started_at = NULL, accumulated_seconds = accumulated_seconds + ?
     WHERE id = ? AND started_at IS NOT NULL`,
    [Math.max(0, Math.round(elapsedDeltaSeconds)), agendaItemId],
  );
}

/** Admin: cambia los minutos planificados de un punto del orden del día. */
export async function updateAgendaItemMinutes(formData: FormData) {
  await requireAdmin();

  const agendaItemId = String(formData.get("agendaItemId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const plannedMinutes = Number(formData.get("plannedMinutes"));
  if (!agendaItemId || !Number.isFinite(plannedMinutes) || plannedMinutes <= 0) {
    throw new Error("Minutos no válidos.");
  }

  await dbRun("UPDATE agile_moderation_agenda_items SET planned_minutes = ? WHERE id = ?", [
    plannedMinutes,
    agendaItemId,
  ]);

  revalidatePath(`/admin/consejos-agile/${slug}/moderacion`);
}

/** Admin: concede una intervención extra a alguien en un punto concreto,
 * por encima del turno por defecto que le da haber respondido ese apartado
 * de la encuesta (ver getAgendaEntitlements en lib/agileModeration.ts). */
export async function grantExtraAgileIntervention(formData: FormData) {
  await requireAdmin();

  const councilId = String(formData.get("councilId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const scouterId = String(formData.get("scouterId") ?? "");
  const agendaItemId = String(formData.get("agendaItemId") ?? "");
  if (!councilId || !scouterId || !agendaItemId) {
    throw new Error("Falta el consejo, la persona o el punto del orden del día.");
  }

  await dbRun(
    `INSERT INTO agile_moderation_intervention_grants (council_id, scouter_id, agenda_item_id, extra_count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(council_id, scouter_id, agenda_item_id) DO UPDATE SET extra_count = extra_count + 1`,
    [councilId, scouterId, agendaItemId],
  );

  revalidatePath(`/admin/consejos-agile/${slug}/moderacion`);
}

// --- Salida de Kraal ---

/** Encuesta de asistencia + confirmación de PPT subido, todo en una fila
 * (ver kraal_outing_responses en lib/db.ts). Solo se admite una fila por
 * persona: reenviar el formulario actualiza la respuesta anterior. */
export async function submitKraalOutingSurvey(formData: FormData) {
  const { scouterId } = await requireScouter();

  const attending = formData.get("attending") === "no" ? "no" : "si";
  const arrivalNote = String(formData.get("arrivalNote") ?? "").trim() || null;
  const staysUntilEnd = formData.get("staysUntilEnd") === "1";
  const departureNote = String(formData.get("departureNote") ?? "").trim() || null;
  const comments = String(formData.get("comments") ?? "").trim() || null;
  const pptUploaded = formData.get("pptUploaded") === "1";

  await dbRun(
    `INSERT INTO kraal_outing_responses
      (scouter_id, attending, arrival_note, stays_until_end, departure_note, comments, ppt_uploaded, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(scouter_id) DO UPDATE SET
       attending = excluded.attending,
       arrival_note = excluded.arrival_note,
       stays_until_end = excluded.stays_until_end,
       departure_note = excluded.departure_note,
       comments = excluded.comments,
       ppt_uploaded = excluded.ppt_uploaded,
       submitted_at = excluded.submitted_at`,
    [
      scouterId,
      attending,
      arrivalNote,
      staysUntilEnd ? 1 : 0,
      departureNote,
      comments,
      pptUploaded ? 1 : 0,
    ],
  );

  revalidatePath("/salida-kraal");
  redirect("/salida-kraal?ok=1");
}
