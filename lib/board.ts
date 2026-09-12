import type { UnitCategory } from "./types";

export interface BoardUnit {
  id: string;
  name: string;
  category: UnitCategory;
  color: string;
  sortOrder: number;
}

export interface BoardCard {
  scouterId: string;
  name: string;
  unitId: string | null;
}

export const UNASSIGNED_COLUMN_ID = "__unassigned__";
