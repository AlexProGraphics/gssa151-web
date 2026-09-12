"use client";

import { useState } from "react";
import {
  BRANCHES,
  BRANCH_LABEL,
  CAMP_AVAILABILITY_POINTS,
  CAMP_FIELD_NAME,
  CAMP_SEASONS,
  CAMP_SEASON_LABEL,
  CARGO_LABEL,
  CARGO_POINTS,
  CARGO_ROLES,
  COMISION_LABEL,
  COMISION_POINTS,
  COMISION_ROLES,
  MTL_TITLE_POINTS,
  SURVEY_MTL_LABEL,
  SURVEY_POINTS_BUDGET,
  SURVEY_VETO_COST,
  type Branch,
  type CampSeason,
  type SurveyMtlStatus,
} from "@/lib/types";

export function PointsBudgetFields({
  otherScouters,
}: {
  otherScouters: { id: string; name: string }[];
}) {
  const [cargos, setCargos] = useState<Set<string>>(new Set());
  const [comisiones, setComisiones] = useState<Set<string>>(new Set());
  const [camps, setCamps] = useState<Record<CampSeason, "si" | "no" | "">>({
    navidad: "",
    semana_santa: "",
    verano: "",
  });
  const [mtlStatus, setMtlStatus] = useState<SurveyMtlStatus | "">("");
  const [points, setPoints] = useState<Record<Branch, number>>({
    castores: 0,
    lobatos: 0,
    tropa: 0,
    escultas: 0,
    clan: 0,
  });
  const [vetoed, setVetoed] = useState<Set<string>>(new Set());

  // Cargos, comisiones, disponibilidad de campamentos y el título MTL
  // AMPLÍAN el budget en vez de gastarlo — recompensa el compromiso sin
  // quitarle margen a quien también quiere priorizar sección o vetar.
  const campSiCount = CAMP_SEASONS.filter((s) => camps[s] === "si").length;
  const mtlBonus = mtlStatus === "si" ? MTL_TITLE_POINTS : 0;
  const extraBudget =
    cargos.size * CARGO_POINTS +
    comisiones.size * COMISION_POINTS +
    campSiCount * CAMP_AVAILABILITY_POINTS +
    mtlBonus;
  const totalBudget = SURVEY_POINTS_BUDGET + extraBudget;
  const spentOnBranches = BRANCHES.reduce((sum, b) => sum + points[b], 0);
  const spentOnVetoes = vetoed.size * SURVEY_VETO_COST;
  const remaining = totalBudget - spentOnBranches - spentOnVetoes;

  function toggleInSet(set: Set<string>, setSet: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSet(next);
  }

  function setBranch(branch: Branch, value: number) {
    const others = BRANCHES.filter((b) => b !== branch).reduce((sum, b) => sum + points[b], 0);
    const maxAllowed = Math.max(0, totalBudget - spentOnVetoes - others);
    const clamped = Math.min(Math.max(0, Math.round(value)), maxAllowed);
    setPoints((p) => ({ ...p, [branch]: clamped }));
  }

  function toggleVeto(id: string) {
    setVetoed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (remaining >= SURVEY_VETO_COST) {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">
          Cargos y comisiones este curso
        </legend>
        <p className="text-xs text-muted">
          Marca en los que vas a estar (o quieres apuntarte) este curso. Cada
          cargo suma {CARGO_POINTS} puntos y cada comisión {COMISION_POINTS}{" "}
          al budget de más abajo — no te quita nada, solo te da más margen
          para priorizar sección o vetar a alguien.
        </p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {CARGO_ROLES.map((role) => (
            <label key={role} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="cargos"
                value={role}
                checked={cargos.has(role)}
                onChange={() => toggleInSet(cargos, setCargos, role)}
              />
              {CARGO_LABEL[role]}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {COMISION_ROLES.map((role) => (
            <label key={role} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="comisiones"
                value={role}
                checked={comisiones.has(role)}
                onChange={() => toggleInSet(comisiones, setComisiones, role)}
              />
              {COMISION_LABEL[role]}
            </label>
          ))}
        </div>
        <textarea
          name="rolesText"
          rows={3}
          placeholder="Cuéntanos qué quieres hacer en esos cargos/comisiones: grado de compromiso y esfuerzo, si ya has estado antes, si vas a liderarlo, cuántos años llevas..."
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">
          Disponibilidad de campamentos (cada &quot;Sí&quot; suma {CAMP_AVAILABILITY_POINTS} puntos)
        </legend>
        <div className="flex flex-col gap-2">
          {CAMP_SEASONS.map((season) => (
            <div
              key={season}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm text-foreground"
            >
              <span>{CAMP_SEASON_LABEL[season]}</span>
              <div className="flex gap-3">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name={CAMP_FIELD_NAME[season]}
                    value="si"
                    required
                    checked={camps[season] === "si"}
                    onChange={() => setCamps((c) => ({ ...c, [season]: "si" }))}
                  />
                  Sí
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name={CAMP_FIELD_NAME[season]}
                    value="no"
                    required
                    checked={camps[season] === "no"}
                    onChange={() => setCamps((c) => ({ ...c, [season]: "no" }))}
                  />
                  No
                </label>
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">
          Título de monitor de tiempo libre (MTL) — tenerlo ya sacado suma{" "}
          {MTL_TITLE_POINTS} puntos
        </legend>
        <div className="flex flex-col gap-2 text-sm text-foreground sm:flex-row sm:gap-4">
          {(Object.keys(SURVEY_MTL_LABEL) as SurveyMtlStatus[]).map((status) => (
            <label key={status} className="flex items-center gap-2">
              <input
                type="radio"
                name="mtlSelfStatus"
                value={status}
                required
                checked={mtlStatus === status}
                onChange={() => setMtlStatus(status)}
              />
              {SURVEY_MTL_LABEL[status]}
            </label>
          ))}
        </div>
      </fieldset>

      <div
        className={`sticky top-2 z-10 flex flex-col gap-3 rounded-lg border bg-surface p-4 shadow-lg ${
          remaining < 0 ? "border-branch-clan" : "border-accent/40"
        }`}
      >
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Tu budget</p>
            <p className="text-3xl font-bold text-foreground">
              {totalBudget} <span className="text-base font-medium text-muted">pts</span>
            </p>
          </div>
          {extraBudget > 0 && (
            <p className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
              +{extraBudget} extra por cargos/comisiones/campamentos/MTL
            </p>
          )}
        </div>

        <div className="flex h-3 w-full overflow-hidden rounded-full bg-background">
          <div
            className="h-full bg-branch-tropa transition-all"
            style={{ width: `${totalBudget > 0 ? (spentOnBranches / totalBudget) * 100 : 0}%` }}
            title="Gastado en secciones"
          />
          <div
            className="h-full bg-branch-clan transition-all"
            style={{ width: `${totalBudget > 0 ? (spentOnVetoes / totalBudget) * 100 : 0}%` }}
            title="Gastado en vetos"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-2 w-2 rounded-full bg-branch-tropa" /> Secciones
            </span>
            <span className="text-sm font-semibold text-foreground">{spentOnBranches} pts</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-2 w-2 rounded-full bg-branch-clan" /> Vetos ({vetoed.size})
            </span>
            <span className="text-sm font-semibold text-foreground">{spentOnVetoes} pts</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-muted">
              <span
                className={`h-2 w-2 rounded-full ${remaining < 0 ? "bg-branch-clan" : "bg-accent"}`}
              />{" "}
              Disponible
            </span>
            <span
              className={`text-sm font-semibold ${remaining < 0 ? "text-branch-clan" : "text-foreground"}`}
            >
              {remaining} pts
            </span>
          </div>
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-foreground">
          Reparte puntos entre secciones para marcar tu prioridad
        </legend>
        {BRANCHES.map((branch) => (
          <div key={branch} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm text-foreground">
              <span>{BRANCH_LABEL[branch]}</span>
              <input
                type="number"
                min={0}
                max={totalBudget}
                value={points[branch]}
                onChange={(e) => setBranch(branch, Number(e.target.value) || 0)}
                className="w-16 rounded-md border border-border bg-surface px-2 py-1 text-right text-sm text-foreground"
              />
            </div>
            <input
              type="range"
              min={0}
              max={totalBudget}
              value={points[branch]}
              onChange={(e) => setBranch(branch, Number(e.target.value))}
              className="w-full"
            />
            <input type="hidden" name={`pref_${branch}`} value={points[branch]} />
          </div>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">
          Con quién, de ninguna forma, podrías compartir unidad ({SURVEY_VETO_COST} puntos
          cada uno)
        </legend>
        <p className="text-xs text-muted">
          Importante: esto NO es &quot;con quién preferirías no estar&quot; — es con
          quién, de ninguna manera, podrías trabajar. Resérvalo para
          incompatibilidades reales, no para simples preferencias (para eso
          ya tienes la lista de compatibles de abajo).
        </p>
        <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-3">
          {otherScouters.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="excludeWith"
                value={s.id}
                checked={vetoed.has(s.id)}
                onChange={() => toggleVeto(s.id)}
                disabled={!vetoed.has(s.id) && remaining < SURVEY_VETO_COST}
              />
              {s.name}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
