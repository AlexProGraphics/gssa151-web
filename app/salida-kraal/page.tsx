import Link from "next/link";
import { getCurrentScouter } from "@/lib/auth";
import { submitKraalOutingSurvey } from "@/app/actions";
import { KraalAttendanceFields } from "@/components/KraalAttendanceFields";
import { KraalSubmitButton } from "@/components/KraalSubmitButton";
import {
  KRAAL_OUTING_DATES,
  KRAAL_OUTING_LOCATION,
  KRAAL_OUTING_PPT_DRIVE_LINK,
  KRAAL_OUTING_PPT_SLIDES,
  KRAAL_OUTING_SCHEDULE,
  getKraalOutingResponse,
} from "@/lib/kraalOuting";

export const dynamic = "force-dynamic";

export default async function SalidaKraalPage({
  searchParams,
}: PageProps<"/salida-kraal">) {
  const { ok } = await searchParams;

  const currentScouter = await getCurrentScouter();

  if (!currentScouter) {
    return (
      <main className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Salida de Kraal</h1>
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← Inicio
          </Link>
        </div>
        <p className="text-sm text-muted">
          Inicia sesión con tu nombre arriba a la derecha para ver el
          horario, confirmar tu asistencia y marcar tu presentación.
        </p>
      </main>
    );
  }

  const own = await getKraalOutingResponse(currentScouter.scouterId);
  const surveyPending = !own;
  const pptPending = !own?.pptUploaded;

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">🏔️ Salida de Kraal</h1>
          <p className="text-sm text-muted">
            {KRAAL_OUTING_DATES} · 📍 {KRAAL_OUTING_LOCATION}
          </p>
        </div>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Inicio
        </Link>
      </div>

      <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-foreground">
        Esta salida es <strong>el momento más importante del año</strong>: va
        a ser histórica y marcará el inicio de una nueva ronda para el GSSA
        💥 ¿De verdad te lo vas a perder? 😏
      </p>

      {ok && (
        <div className="flex items-center gap-3 rounded-lg border-2 border-branch-tropa bg-branch-tropa/15 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-branch-tropa text-lg text-background">
            ✓
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">¡Enviado! Tu respuesta se ha guardado.</p>
            <p className="text-xs text-muted">
              Puedes volver a enviar el formulario cuando quieras — cada envío actualiza tu respuesta anterior, no la duplica.
            </p>
          </div>
        </div>
      )}

      {/* Resumen de pendientes: lo primero que se ve, para que quede claro
          de un vistazo qué falta — el mismo par de estados enciende el
          puntito rojo del nav (ver lib/kraalOuting.ts). */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className={
            surveyPending
              ? "rounded-lg border border-branch-clan/50 bg-branch-clan/10 px-4 py-3"
              : "rounded-lg border border-branch-tropa/40 bg-branch-tropa/10 px-4 py-3"
          }
        >
          <p className="text-sm font-medium text-foreground">
            {surveyPending ? "⏳ Encuesta de asistencia: pendiente" : "✓ Encuesta de asistencia: enviada"}
          </p>
          {!surveyPending && own && (
            <p className="mt-0.5 text-xs text-muted">
              {own.attending === "si" ? "Vienes" : "No vienes"} — enviada el{" "}
              {new Date(own.submittedAt).toLocaleString("es-ES")}.
            </p>
          )}
        </div>
        <div
          className={
            pptPending
              ? "rounded-lg border border-branch-clan/50 bg-branch-clan/10 px-4 py-3"
              : "rounded-lg border border-branch-tropa/40 bg-branch-tropa/10 px-4 py-3"
          }
        >
          <p className="text-sm font-medium text-foreground">
            {pptPending ? "⏳ Presentación PPT: pendiente" : "✓ Presentación PPT: subida"}
          </p>
          {pptPending && (
            <p className="mt-0.5 text-xs text-muted">Súbela al Drive y marca la casilla de abajo.</p>
          )}
        </div>
      </div>

      {/* --- Horario --- */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">🗓️ Horario</h2>
        {KRAAL_OUTING_SCHEDULE.map((day) => (
          <div key={day.day} className="rounded-lg border border-border p-4">
            <h3 className="mb-2 text-sm font-semibold text-accent">{day.day}</h3>
            <ul className="flex flex-col gap-1.5">
              {day.items.map((item) => (
                <li key={`${day.day}-${item.time}-${item.title}`} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="w-28 shrink-0 font-mono text-xs text-muted">{item.time}</span>
                  <span className="text-foreground">{item.title}</span>
                  {item.responsible && <span className="text-xs text-muted">({item.responsible})</span>}
                </li>
              ))}
            </ul>
            {day.note && <p className="mt-2 text-xs text-muted">{day.note}</p>}
          </div>
        ))}
      </section>

      {/* --- Presentación PPT --- */}
      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="text-lg font-semibold text-foreground">🎤 Tu presentación (PowerPoint & Bubble Tea)</h2>
        <p className="text-sm text-muted">
          El sábado, en el bloque de <strong>16:00–17:45</strong>, cada uno
          presenta su PowerPoint: <strong>3 diapositivas, un minuto por
          diapositiva, 3 minutos en total</strong>. Pon <strong>muchas
          fotos</strong> en cada diapositiva.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {KRAAL_OUTING_PPT_SLIDES.map((slide, i) => (
            <div key={slide.title} className="rounded-md border border-border bg-surface p-3">
              <p className="text-xs font-semibold text-accent">Diapositiva {i + 1} · {slide.title}</p>
              <p className="mt-1 text-xs text-muted">{slide.detail}</p>
            </div>
          ))}
        </div>
        <a
          href={KRAAL_OUTING_PPT_DRIVE_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit rounded-md border border-accent px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent/10"
        >
          📤 Subir mi presentación al Drive →
        </a>
      </section>

      {/* --- Formulario --- */}
      <form action={submitKraalOutingSurvey} className="flex flex-col gap-6">
        <KraalAttendanceFields
          initialAttending={own?.attending ?? "si"}
          initialArrivalNote={own?.arrivalNote ?? ""}
          initialStaysUntilEnd={own?.staysUntilEnd ?? true}
          initialDepartureNote={own?.departureNote ?? ""}
        />

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Algo más que quieras avisar (opcional)</span>
          <textarea
            name="comments"
            rows={3}
            defaultValue={own?.comments ?? ""}
            placeholder="Ej: alergias, si necesitas que te lleven, etc."
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>

        <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground">
          <input type="checkbox" name="pptUploaded" value="1" defaultChecked={own?.pptUploaded ?? false} />
          Ya he subido mi presentación al Drive
        </label>

        <div className="flex flex-col gap-2">
          <KraalSubmitButton isUpdate={!!own} />
          <p className="text-xs text-muted">
            Puedes enviarla las veces que quieras: cada envío actualiza tu respuesta anterior, no la duplica.
          </p>
        </div>
      </form>
    </main>
  );
}
