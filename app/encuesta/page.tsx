import Link from "next/link";
import { dbAll } from "@/lib/db";
import { getCurrentScouter } from "@/lib/auth";
import { submitSurvey } from "@/app/actions";
import { PointsBudgetFields } from "@/components/PointsBudgetFields";
import { FavoritesField } from "@/components/FavoritesField";
import { SubmitCountdown } from "@/components/SubmitCountdown";
import { SURVEY_POINTS_BUDGET, SURVEY_VETO_COST } from "@/lib/types";

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

  const scouterRows = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM scouters WHERE active = 1 ORDER BY name",
  );
  // Los Row de libsql no son objetos planos — hay que plain-ificarlos antes
  // de pasarlos a un Client Component (PointsBudgetFields), o React se
  // niega a serializarlos.
  const otherScouters = scouterRows
    .filter((s) => s.id !== currentScouter.scouterId)
    .map((s) => ({ id: s.id, name: s.name }));

  const unitRows = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM units ORDER BY sort_order",
  );
  const units = unitRows.map((u) => ({ id: u.id, name: u.name }));

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
          sigue sin funcionar, contacta con la coordinación (Alex Muñoz o
          Gabi) para solucionarlo.
        </p>
      )}

      {error === "budget_exceeded" && (
        <p className="rounded-md border border-branch-clan/40 bg-branch-clan/10 px-3 py-2 text-sm text-foreground">
          Te has pasado del budget (secciones + vetos a {SURVEY_VETO_COST}{" "}
          puntos cada uno). Ajusta el reparto y vuelve a enviar.
        </p>
      )}

      {error === "locked" && (
        <p className="rounded-md border border-branch-clan/40 bg-branch-clan/10 px-3 py-2 text-sm text-foreground">
          Todavía no se puede enviar la encuesta — espera a que se abra el
          envío (mira la cuenta atrás al final del formulario).
        </p>
      )}

      <p className="text-sm text-muted">
        Tus respuestas son confidenciales: solo las ve la coordinación para
        montar la parrilla — nunca el resto del kraal ni la web pública.
        Tienes un budget de {SURVEY_POINTS_BUDGET} puntos para repartir entre
        priorizar secciones y vetar gente ({SURVEY_VETO_COST} puntos cada
        veto) — elegir con quién trabajarías bien es gratis y sin límite.
        Comprometerte a un cargo o comisión, tener disponibilidad en
        campamentos o tener ya el título de MTL te da puntos extra de budget
        (más abajo tienes el detalle).
      </p>

      <form action={submitSurvey} className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium text-foreground">
            Tu unidad este último curso
          </legend>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-foreground">
              ¿En qué unidad estuviste el curso 25/26?
            </span>
            <select
              name="previousUnitId"
              defaultValue=""
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            >
              <option value="">Elige una unidad</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-foreground">
              ¿Cuántos años llevas en esa unidad?
            </span>
            <input
              type="number"
              name="yearsInUnit"
              min={0}
              step="0.5"
              className="w-32 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm text-foreground">¿Seguirías en la misma unidad?</legend>
            <div className="flex gap-4 text-sm text-foreground">
              <label className="flex items-center gap-2">
                <input type="radio" name="unitContinuity" value="mantener" />
                Mantengo unidad
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="unitContinuity" value="cambiar" />
                Quiero cambiar
              </label>
            </div>
          </fieldset>
        </fieldset>

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

        <FavoritesField otherScouters={otherScouters} />

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

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            Algo que nos quieras decir
          </span>
          <p className="text-xs text-muted">
            Cuéntanos con detalle todo con lo que te vas a comprometer este
            año: qué unidad o unidades quieres, por qué, con qué grado de
            implicación, y cualquier cosa más que creas que la coordinación
            debería saber para hacer la mejor parrilla posible. Cuanto mejor
            lo expliques, más fácil nos lo pones.
          </p>
          <textarea
            name="freeText"
            rows={5}
            placeholder="Ej: Este año quiero estar en Tropa, llevo 3 años ayudando ahí y me gustaría liderar el equipo. Puedo comprometerme a X horas/semana, estaré disponible casi todos los findes..."
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>

        <SubmitCountdown />
      </form>
    </main>
  );
}
