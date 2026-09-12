import Link from "next/link";
import { dbAll } from "@/lib/db";
import { getCurrentScouter } from "@/lib/auth";
import { submitSurvey } from "@/app/actions";
import { PointsBudgetFields } from "@/components/PointsBudgetFields";
import {
  CAMP_FIELD_NAME,
  CAMP_SEASONS,
  CAMP_SEASON_LABEL,
  SURVEY_MTL_LABEL,
  SURVEY_POINTS_BUDGET,
  SURVEY_VETO_COST,
  type SurveyMtlStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EncuestaPage({
  searchParams,
}: PageProps<"/encuesta">) {
  const { ok, error } = await searchParams;

  const currentScouter = await getCurrentScouter();

  if (!currentScouter) {
    return (
      <main className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Encuesta de preferencias</h1>
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← Inicio
          </Link>
        </div>
        <p className="text-sm text-muted">
          Inicia sesión con tu nombre arriba a la derecha para rellenar tu
          encuesta. Si es la primera vez que entras, la contraseña que
          escribas ahí se queda fijada como la tuya.
        </p>
      </main>
    );
  }

  const scouters = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM scouters WHERE active = 1 ORDER BY name",
  );
  const otherScouters = scouters.filter((s) => s.id !== currentScouter.scouterId);

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          Encuesta de preferencias — Ronda 2026/27
        </h1>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Inicio
        </Link>
      </div>

      {ok && (
        <p className="rounded-md border border-branch-tropa/40 bg-branch-tropa/10 px-3 py-2 text-sm text-foreground">
          ¡Gracias! Tu respuesta se ha guardado. Puedes volver a enviarla si
          quieres cambiar algo.
        </p>
      )}

      {error === "save_failed" && (
        <p className="rounded-md border border-branch-clan/40 bg-branch-clan/10 px-3 py-2 text-sm text-foreground">
          Tu respuesta <strong>no se ha guardado</strong> — ha fallado el
          guardado en el servidor. Vuelve a intentarlo en un momento y, si
          sigue sin funcionar, contacta con el kraal (Alex Muñoz o Gabi)
          para solucionarlo.
        </p>
      )}

      {error === "budget_exceeded" && (
        <p className="rounded-md border border-branch-clan/40 bg-branch-clan/10 px-3 py-2 text-sm text-foreground">
          Te has pasado del presupuesto de {SURVEY_POINTS_BUDGET} puntos
          (secciones + vetos a {SURVEY_VETO_COST} puntos cada uno). Ajusta el
          reparto y vuelve a enviar.
        </p>
      )}

      <p className="text-sm text-muted">
        Tus respuestas son confidenciales: solo las ve el kraal/coordis para
        montar la parrilla, nunca se muestran en la web pública. Tienes{" "}
        {SURVEY_POINTS_BUDGET} puntos para repartir entre priorizar secciones
        y vetar gente ({SURVEY_VETO_COST} puntos cada veto) — elegir con
        quién trabajarías bien es gratis y sin límite.
      </p>

      <form action={submitSurvey} className="flex flex-col gap-6">
        <PointsBudgetFields otherScouters={otherScouters} />

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-foreground">
            ¿Prefieres priorizar la sección o el equipo de trabajo?
          </legend>
          <div className="flex gap-4 text-sm text-foreground">
            <label className="flex items-center gap-2">
              <input type="radio" name="priorityPref" value="seccion" />
              La sección/rama
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="priorityPref" value="equipo" />
              El equipo de trabajo
            </label>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-foreground">
            Con quién crees que podrías trabajar bien (gratis, sin límite)
          </legend>
          <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-3">
            {otherScouters.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" name="compatibleWith" value={s.id} />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-foreground">
            Disponibilidad durante el año
          </legend>
          <div className="flex flex-col gap-2 text-sm text-foreground sm:flex-row sm:gap-4">
            {CAMP_SEASONS.map((season) => (
              <label key={season} className="flex items-center gap-2">
                <input type="checkbox" name={CAMP_FIELD_NAME[season]} />
                {CAMP_SEASON_LABEL[season]}
              </label>
            ))}
          </div>
          <textarea
            name="availability"
            rows={3}
            placeholder="Explica tu disponibilidad durante el año (exámenes, viajes, otros compromisos…) o da más detalle"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-foreground">
            Título de monitor de tiempo libre (MTL)
          </legend>
          <div className="flex flex-col gap-2 text-sm text-foreground sm:flex-row sm:gap-4">
            {(Object.keys(SURVEY_MTL_LABEL) as SurveyMtlStatus[]).map((status) => (
              <label key={status} className="flex items-center gap-2">
                <input type="radio" name="mtlSelfStatus" value={status} required />
                {SURVEY_MTL_LABEL[status]}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            Algo que nos quieras decir
          </span>
          <textarea
            name="freeText"
            rows={3}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>

        <button
          type="submit"
          className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-background"
        >
          Enviar
        </button>
      </form>
    </main>
  );
}
