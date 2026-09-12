"use client";

import { useState } from "react";
import {
  BRANCHES,
  BRANCH_LABEL,
  CARGO_LABEL,
  CARGO_POINTS,
  CARGO_ROLES,
  COMISION_LABEL,
  COMISION_POINTS,
  COMISION_ROLES,
  SURVEY_POINTS_BUDGET,
  SURVEY_VETO_COST,
  type Branch,
} from "@/lib/types";

export function PointsBudgetFields({
  otherScouters,
}: {
  otherScouters: { id: string; name: string }[];
}) {
  const [cargos, setCargos] = useState<Set<string>>(new Set());
  const [comisiones, setComisiones] = useState<Set<string>>(new Set());
  const [points, setPoints] = useState<Record<Branch, number>>({
    castores: 0,
    lobatos: 0,
    tropa: 0,
    escultas: 0,
    clan: 0,
  });
  const [vetoed, setVetoed] = useState<Set<string>>(new Set());

  // Cargos/comisiones AMPLÍAN el presupuesto en vez de gastarlo — recompensa
  // el compromiso sin quitarle margen a quien también quiere priorizar
  // sección o vetar a alguien.
  const extraBudget = cargos.size * CARGO_POINTS + comisiones.size * COMISION_POINTS;
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
          al presupuesto de más abajo — no te quita nada, solo te da más
          margen para priorizar sección o vetar a alguien.
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

      <div
        className={`rounded-md border px-3 py-2 text-sm font-medium ${
          remaining < 0
            ? "border-branch-clan text-branch-clan"
            : "border-border text-foreground"
        }`}
      >
        Puntos disponibles: {remaining} / {totalBudget}
        {extraBudget > 0 && (
          <span className="ml-1 font-normal text-muted">
            ({SURVEY_POINTS_BUDGET} base + {extraBudget} por cargos/comisiones)
          </span>
        )}
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
          Con quién NO podrías compartir unidad de ninguna forma ({SURVEY_VETO_COST} puntos
          cada uno)
        </legend>
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
