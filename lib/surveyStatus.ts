import { dbGet } from "./db";
import { SURVEY_SUBMIT_DEADLINE_AT } from "./types";

/** Aislado en su propia función (no inline en el componente) para que el
 * lint de pureza de Server Components no se queje de llamar a Date.now()
 * directamente en el render — ver el mismo patrón en lib/agileCouncils.ts. */
export function isSurveyDeadlinePassed(): boolean {
  return Date.now() > new Date(SURVEY_SUBMIT_DEADLINE_AT).getTime();
}

/** 'seed' es el volcado inicial del Excel, no una respuesta real por la
 * encuesta — solo cuenta como "enviada" si viene de /encuesta (source='web'). */
export async function hasSubmittedSurvey(scouterId: string): Promise<boolean> {
  const row = await dbGet<{ scouterId: string }>(
    "SELECT scouter_id AS scouterId FROM survey_responses WHERE scouter_id = ? AND source = 'web'",
    [scouterId],
  );
  return !!row;
}

/** Para el puntito de "sin leer" en el nav: solo mientras siga sin enviarse
 * Y el plazo siga abierto — se apaga con cualquiera de las dos cosas. */
export async function isSurveyPending(scouterId: string): Promise<boolean> {
  if (isSurveyDeadlinePassed()) return false;
  return !(await hasSubmittedSurvey(scouterId));
}
