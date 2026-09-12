"use client";

import { useState } from "react";
import { BRANCHES, BRANCH_LABEL, SURVEY_POINTS_BUDGET, SURVEY_VETO_COST, type Branch } from "@/lib/types";

export function PointsBudgetFields({
  otherScouters,
}: {
  otherScouters: { id: string; name: string }[];
}) {
  const [points, setPoints] = useState<Record<Branch, number>>({
    castores: 0,
    lobatos: 0,
    tropa: 0,
    escultas: 0,
    clan: 0,
  });
  const [vetoed, setVetoed] = useState<Set<string>>(new Set());

  const spentOnBranches = BRANCHES.reduce((sum, b) => sum + points[b], 0);
  const spentOnVetoes = vetoed.size * SURVEY_VETO_COST;
  const remaining = SURVEY_POINTS_BUDGET - spentOnBranches - spentOnVetoes;

  function setBranch(branch: Branch, value: number) {
    const others = BRANCHES.filter((b) => b !== branch).reduce((sum, b) => sum + points[b], 0);
    const maxAllowed = Math.max(0, SURVEY_POINTS_BUDGET - spentOnVetoes - others);
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
      <div
        className={`rounded-md border px-3 py-2 text-sm font-medium ${
          remaining < 0
            ? "border-branch-clan text-branch-clan"
            : "border-border text-foreground"
        }`}
      >
        Puntos disponibles: {remaining} / {SURVEY_POINTS_BUDGET}
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
                max={SURVEY_POINTS_BUDGET}
                value={points[branch]}
                onChange={(e) => setBranch(branch, Number(e.target.value) || 0)}
                className="w-16 rounded-md border border-border bg-surface px-2 py-1 text-right text-sm text-foreground"
              />
            </div>
            <input
              type="range"
              min={0}
              max={SURVEY_POINTS_BUDGET}
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
