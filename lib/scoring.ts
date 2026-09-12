import type { Branch, UnitCategory } from "./types";

/** Admin-only suggestion engine. Never import this from a client component
 * or a route that unauthenticated users can reach — its inputs are the
 * confidential scoring tables. */

const CATEGORY_TO_BRANCH: Partial<Record<UnitCategory, Branch>> = {
  castores: "castores",
  manada: "lobatos",
  tropa: "tropa",
  esculta: "escultas",
  clan: "clan",
};

const MTL_WEIGHT: Record<string, number> = {
  SI: 2,
  EN_CURSO: 1,
  NO: 0,
  NO_SE: 0,
};

export interface ScoringInput {
  scouterId: string;
  mtlStatus: string | null;
  confianza: number | null;
  liderScore: number | null;
  branchExperience: Partial<Record<Branch, number>>;
  preference: Partial<Record<Branch, number>>;
}

export interface ExclusionPair {
  a: string;
  b: string;
}

/** Higher is a better fit for that unit's branch. 0 for support (apoyo) units. */
export function scoreForUnit(input: ScoringInput, category: UnitCategory): number {
  const branch = CATEGORY_TO_BRANCH[category];
  if (!branch) return 0;

  const preference = input.preference[branch] ?? 0;
  const experience = Math.min(input.branchExperience[branch] ?? 0, 3);
  const mtl = MTL_WEIGHT[input.mtlStatus ?? "NO"] ?? 0;
  const confianza = input.confianza ?? 0;
  const lider = input.liderScore ?? 0;

  return preference * 2 + experience * 1.5 + mtl * 2 + confianza + lider;
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

/**
 * Greedy suggestion: fills in every currently-unassigned scouter into the
 * unit where they score best, skipping any unit that already holds a
 * scouter they have a hard exclusion with. Existing assignments are kept
 * untouched — this only proposes placements for empty slots.
 */
export function generateSuggestion(params: {
  scouters: ScoringInput[];
  units: { id: string; category: UnitCategory }[];
  existingAssignments: Record<string, string>;
  exclusions: ExclusionPair[];
}): Record<string, string> {
  const { scouters, units, existingAssignments, exclusions } = params;
  const assignments = { ...existingAssignments };
  const exclusionSet = new Set(exclusions.map((e) => pairKey(e.a, e.b)));
  const candidateUnits = units.filter((u) => u.category !== "apoyo");

  const unassigned = scouters.filter((s) => !assignments[s.scouterId]);

  for (const scouter of unassigned) {
    let bestUnitId: string | null = null;
    let bestScore = -Infinity;

    for (const unit of candidateUnits) {
      const hasConflict = Object.entries(assignments).some(
        ([otherScouterId, unitId]) =>
          unitId === unit.id &&
          exclusionSet.has(pairKey(scouter.scouterId, otherScouterId)),
      );
      if (hasConflict) continue;

      const score = scoreForUnit(scouter, unit.category);
      if (score > bestScore) {
        bestScore = score;
        bestUnitId = unit.id;
      }
    }

    // A score of 0 means "no signal at all" (no MTL, experience, preference,
    // confianza or líder on record) — leave those scouters unassigned
    // instead of dumping them all in whichever unit happens to be first.
    if (bestUnitId && bestScore > 0) {
      assignments[scouter.scouterId] = bestUnitId;
    }
  }

  return assignments;
}
