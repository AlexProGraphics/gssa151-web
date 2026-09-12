"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { dbAll, dbGet, dbRun } from "@/lib/db";
import {
  SCOUTER_SESSION_COOKIE,
  SESSION_COOKIE,
  adminSetScouterPassword,
  createScouterSession,
  createSession,
  deleteScouterSession,
  deleteSession,
  findAdminByScouterId,
  findScouterAccount,
  registerScouterAccount,
  requireAdmin,
  requireScouter,
  verifyPassword,
} from "@/lib/auth";
import { generateSuggestion, type ExclusionPair, type ScoringInput } from "@/lib/scoring";
import {
  BRANCHES,
  CARGO_POINTS,
  CARGO_ROLES,
  COMISION_POINTS,
  COMISION_ROLES,
  SURVEY_POINTS_BUDGET,
  SURVEY_VETO_COST,
  type Branch,
  type UnitCategory,
} from "@/lib/types";

/**
 * Login único para todo el mundo (el desplegable lista a los 33, admins
 * incluidos): si el nombre elegido es uno de los dos admins fijos y la
 * contraseña coincide con la suya, entra como admin. En cualquier otro
 * caso (incluidos Gabi/Alex Muñoz escribiendo su propia contraseña de
 * scouter, no la fija de admin) se trata como login/registro de scouter:
 * si nadie ha reclamado todavía esa identidad, la contraseña enviada la
 * fija; si ya está reclamada, tiene que coincidir con la que se fijó la
 * primera vez. Así cada admin conserva, con la misma casilla, acceso
 * independiente a su panel y a su propia encuesta/parrilla de scouter.
 */
export async function unifiedLogin(formData: FormData) {
  const scouterId = String(formData.get("scouterId") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!scouterId || !password) {
    redirect(`${next}?loginError=missing`);
  }

  const admin = await findAdminByScouterId(scouterId);
  if (admin && verifyPassword(password, admin.passwordHash)) {
    const token = await createSession(admin.id);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    redirect(next.startsWith("/admin") ? next : "/admin/board");
  }

  const scouter = await dbGet<{ id: string }>(
    "SELECT id FROM scouters WHERE id = ? AND active = 1",
    [scouterId],
  );
  if (!scouter) {
    redirect(`${next}?loginError=invalid`);
  }

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

  const token = await createScouterSession(scouterId);
  const cookieStore = await cookies();
  cookieStore.set(SCOUTER_SESSION_COOKIE, token, {
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

export async function scouterLogout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SCOUTER_SESSION_COOKIE)?.value;
  if (token) await deleteScouterSession(token);
  cookieStore.delete(SCOUTER_SESSION_COOKIE);
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

/** Congela el borrador actual como un nuevo envío — se acumulan, no se pisan. */
export async function submitProposal() {
  const owner = await requireScouter();

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

  const priorityPref = formData.get("priorityPref");
  const availability = String(formData.get("availability") ?? "").trim() || null;
  const freeText = String(formData.get("freeText") ?? "").trim() || null;
  const availNavidad = formData.get("availNavidad") ? 1 : 0;
  const availSemanaSanta = formData.get("availSemanaSanta") ? 1 : 0;
  const availVerano = formData.get("availVerano") ? 1 : 0;
  const mtlSelfStatus = String(formData.get("mtlSelfStatus") ?? "").trim() || null;
  const rolesText = String(formData.get("rolesText") ?? "").trim() || null;

  // Cargos/comisiones AMPLÍAN el presupuesto (nunca lo reducen) — cada uno
  // solo cuenta si es uno de los válidos, para no dejar que un valor
  // manipulado en el formulario infle el presupuesto de mentira.
  const cargoSet = new Set<string>(CARGO_ROLES);
  const comisionSet = new Set<string>(COMISION_ROLES);
  const cargoIds = formData.getAll("cargos").map(String).filter((id) => cargoSet.has(id));
  const comisionIds = formData
    .getAll("comisiones")
    .map(String)
    .filter((id) => comisionSet.has(id));
  const totalBudget =
    SURVEY_POINTS_BUDGET + cargoIds.length * CARGO_POINTS + comisionIds.length * COMISION_POINTS;

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

  // Si la base de datos no puede escribir (disco lleno, fichero bloqueado…)
  // que quede claro que NO se ha guardado nada, en vez de un error genérico.
  try {
    await dbRun(
      `INSERT INTO survey_responses
        (scouter_id, priority_pref, availability, free_text, avail_navidad, avail_semana_santa,
         avail_verano, mtl_self_status, roles_text, pref_castores, pref_lobatos, pref_tropa, pref_escultas, pref_clan, source, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'web', datetime('now'))
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
         source = excluded.source,
         submitted_at = excluded.submitted_at`,
      [
        scouterId,
        (priorityPref as string) || null,
        availability,
        freeText,
        availNavidad,
        availSemanaSanta,
        availVerano,
        mtlSelfStatus,
        rolesText,
        pref.castores,
        pref.lobatos,
        pref.tropa,
        pref.escultas,
        pref.clan,
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
