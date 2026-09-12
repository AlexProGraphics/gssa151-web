export type UnitCategory =
  | "castores"
  | "manada"
  | "tropa"
  | "esculta"
  | "clan"
  | "apoyo";

export const CATEGORY_COLOR: Record<UnitCategory, string> = {
  castores: "var(--branch-castores)",
  manada: "var(--branch-manada)",
  tropa: "var(--branch-tropa)",
  esculta: "var(--branch-esculta)",
  clan: "var(--branch-clan)",
  apoyo: "var(--branch-apoyo)",
};

export const CATEGORY_LABEL: Record<UnitCategory, string> = {
  castores: "Castores",
  manada: "Manada (Lobatos)",
  tropa: "Tropa (Scouts)",
  esculta: "Esculta (Pioneros)",
  clan: "Clan (Rovers)",
  apoyo: "Cargos y Apoyo",
};

export type MtlStatus = "SI" | "NO" | "EN_CURSO" | "NO_SE";

export type Branch = "castores" | "lobatos" | "tropa" | "escultas" | "clan";

export const BRANCHES: Branch[] = [
  "castores",
  "lobatos",
  "tropa",
  "escultas",
  "clan",
];

export const BRANCH_LABEL: Record<Branch, string> = {
  castores: "Castores",
  lobatos: "Lobatos",
  tropa: "Tropa",
  escultas: "Escultas",
  clan: "Clan",
};

// Sistema de puntos de la encuesta: cada scouter reparte un presupuesto
// fijo entre secciones (prioridad) y vetos (incompatibilidades) — elegir
// compatibles sigue siendo gratis e ilimitado.
export const SURVEY_POINTS_BUDGET = 100;
export const SURVEY_VETO_COST = 10;

export type PriorityPref = "seccion" | "equipo";

export type CampSeason = "navidad" | "semana_santa" | "verano";

export const CAMP_SEASONS: CampSeason[] = ["navidad", "semana_santa", "verano"];

export const CAMP_SEASON_LABEL: Record<CampSeason, string> = {
  navidad: "Campamento de Navidad",
  semana_santa: "Campamento de Semana Santa",
  verano: "Campamento de Verano",
};

/** Nombre del campo de formulario para cada temporada (coincide con lo que lee submitSurvey). */
export const CAMP_FIELD_NAME: Record<CampSeason, string> = {
  navidad: "availNavidad",
  semana_santa: "availSemanaSanta",
  verano: "availVerano",
};

/** Autodeclarado por el scouter en la encuesta — no confundir con el
 * `MtlStatus` confidencial que gestiona el kraal en `scouter_scores`. */
export type SurveyMtlStatus = "si" | "en_curso" | "no";

export const SURVEY_MTL_LABEL: Record<SurveyMtlStatus, string> = {
  si: "Sí, ya lo tengo",
  en_curso: "Me lo voy a sacar este curso (llega para verano)",
  no: "No lo tengo",
};

/** Public, non-confidential shape — safe to send to unauthenticated clients. */
export interface PublicUnit {
  id: string;
  name: string;
  category: UnitCategory;
  sortOrder: number;
}

export interface PublicScouterCard {
  scouterId: string;
  name: string;
  unitId: string | null;
}

/** Admin-only shape — never fetched by public pages. */
export interface AdminScouter {
  id: string;
  name: string;
  birthYear: number | null;
  mtlStatus: MtlStatus | null;
  totalExperienceYears: number | null;
  confianza: number | null;
  liderScore: number | null;
  active: boolean;
}

export interface ScouterBranchExperience {
  scouterId: string;
  branch: Branch;
  years: number;
}

export interface SurveyResponse {
  scouterId: string;
  priorityPref: PriorityPref | null;
  availability: string | null;
  freeText: string | null;
  availNavidad: boolean;
  availSemanaSanta: boolean;
  availVerano: boolean;
  mtlSelfStatus: SurveyMtlStatus | null;
  prefCastores: number | null;
  prefLobatos: number | null;
  prefTropa: number | null;
  prefEscultas: number | null;
  prefClan: number | null;
  submittedAt: string;
}

export type CompatibilityType = "compatible" | "exclusion";

export interface SurveyCompatibility {
  scouterId: string;
  otherScouterId: string;
  type: CompatibilityType;
}
