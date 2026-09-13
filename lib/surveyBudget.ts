import {
  CAMP_AVAILABILITY_POINTS,
  CARGO_POINTS,
  COMISION_POINTS,
  MTL_TITLE_POINTS,
  SURVEY_POINTS_BUDGET,
  type CampAvailability,
  type CampSeason,
  type SurveyMtlStatus,
} from "./types";

/** "Parcial" da la mitad de los puntos de ese campamento, redondeado hacia
 * abajo — cualquier otro valor (incluido null/legado) no da puntos. */
export function campAvailabilityPoints(
  season: CampSeason,
  avail: CampAvailability | null | undefined,
): number {
  const full = CAMP_AVAILABILITY_POINTS[season];
  if (avail === "si") return full;
  if (avail === "parcial") return Math.floor(full / 2);
  return 0;
}

/** Budget total de una respuesta de encuesta — misma fórmula que usa
 * submitSurvey al guardar, para que la bandeja de admin, el export a Excel
 * y la analítica siempre muestren el mismo número que el que de verdad se
 * validó al guardar. */
export function computeSurveyTotalBudget(params: {
  cargoCount: number;
  comisionCount: number;
  availNavidad: CampAvailability | null | undefined;
  availSemanaSanta: CampAvailability | null | undefined;
  availVerano: CampAvailability | null | undefined;
  mtlSelfStatus: SurveyMtlStatus | null | undefined;
}): number {
  const campPoints =
    campAvailabilityPoints("navidad", params.availNavidad) +
    campAvailabilityPoints("semana_santa", params.availSemanaSanta) +
    campAvailabilityPoints("verano", params.availVerano);
  const mtlBonus = params.mtlSelfStatus === "si" ? MTL_TITLE_POINTS : 0;

  return (
    SURVEY_POINTS_BUDGET +
    params.cargoCount * CARGO_POINTS +
    params.comisionCount * COMISION_POINTS +
    campPoints +
    mtlBonus
  );
}
