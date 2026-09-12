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
// entre secciones (prioridad) y vetos (incompatibilidades) — elegir
// compatibles sigue siendo gratis e ilimitado. El presupuesto base es
// SURVEY_POINTS_BUDGET, pero comprometerse a cargos/comisiones lo AMPLÍA
// (ver CARGO_POINTS/COMISION_POINTS) — nunca lo reduce.
export const SURVEY_POINTS_BUDGET = 100;
export const SURVEY_VETO_COST = 10;

export type CargoRole = "tesoreria" | "intendencia" | "secretaria" | "campamentos";

export const CARGO_ROLES: CargoRole[] = [
  "tesoreria",
  "intendencia",
  "secretaria",
  "campamentos",
];

export const CARGO_LABEL: Record<CargoRole, string> = {
  tesoreria: "Tesorería",
  intendencia: "Intendencia",
  secretaria: "Secretaría",
  campamentos: "Campamentos",
};

export type ComisionRole =
  | "socorrismo"
  | "juegos_grupo"
  | "formaciones"
  | "menu"
  | "animacion"
  | "comision_catolica"
  | "espacio_seguro"
  | "tecnomision"
  | "cuna"
  | "peg";

export const COMISION_ROLES: ComisionRole[] = [
  "socorrismo",
  "juegos_grupo",
  "formaciones",
  "menu",
  "animacion",
  "comision_catolica",
  "espacio_seguro",
  "tecnomision",
  "cuna",
  "peg",
];

export const COMISION_LABEL: Record<ComisionRole, string> = {
  socorrismo: "Socorrismo",
  juegos_grupo: "Juegos de Grupo",
  formaciones: "Formaciones",
  menu: "Menú",
  animacion: "Animación",
  comision_catolica: "Comisión Católica",
  espacio_seguro: "Espacio Seguro",
  tecnomision: "Tecnomisión",
  cuna: "Cuna",
  peg: "PEG",
};

// Un cargo aporta el doble de budget que una comisión — recompensa
// el esfuerzo sin ser el único factor. Solo informativo para el algoritmo
// de sugerencia (el kraal lo valora a mano); aquí solo amplían el
// budget que el propio scouter reparte en su encuesta.
export const CARGO_POINTS = 5;
export const COMISION_POINTS = 3;

// Cada campamento con disponibilidad confirmada ("Sí") también amplía el
// budget — igual mecánica que cargos/comisiones.
export const CAMP_AVAILABILITY_POINTS = 2;

// Fecha/hora hasta la que la web sigue "en construcción" mientras se termina
// de pulir la encuesta y el sistema de budget — un banner lo avisa en todas
// las páginas (ver MaintenanceBanner), y el envío de la encuesta comparte
// exactamente el mismo límite: no tendría sentido abrir el envío antes de
// que termine el propio aviso de "en construcción".
export const SITE_MAINTENANCE_UNTIL = "2026-09-13T12:00:00+02:00";

// El botón de enviar queda bloqueado hasta esta fecha mientras se sigue
// ajustando el sistema de budget — se comparte entre el componente cliente
// (cuenta atrás) y submitSurvey (bloqueo real en servidor, por si alguien
// se salta el botón deshabilitado).
export const SURVEY_SUBMIT_UNLOCK_AT = SITE_MAINTENANCE_UNTIL;

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

// Tener el título ya sacado (no "en curso") también amplía el budget.
export const MTL_TITLE_POINTS = 5;

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
  rolesText: string | null;
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
