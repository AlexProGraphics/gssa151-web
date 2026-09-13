import Link from "next/link";
import { notFound } from "next/navigation";
import { dbAll } from "@/lib/db";
import { getCurrentScouter } from "@/lib/auth";
import {
  getAgileCouncilBySlug,
  getAgileResponseDeadline,
  isAgileResponseWindowOpen,
} from "@/lib/agileCouncils";
import { submitAgileCouncilResponse } from "@/app/actions";
import { AgileCouncilResponsesToggle } from "@/components/AgileCouncilResponsesToggle";
import { AGILE_PAG_AMBITOS, AGILE_PAG_AMBITO_LABEL, type AgileCouncilResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ResponseRow {
  councilId: string;
  scouterId: string;
  scouterName: string;
  pagSocial: string | null;
  pagAmbiental: string | null;
  pagEspiritual: string | null;
  pagSalud: string | null;
  calendarReviewed: number;
  calendarComments: string | null;
  chavalesExcelDone: number;
  chavalesComments: string | null;
  ruegosPreguntas: string | null;
  submittedAt: string;
}

export default async function AgileCouncilDetailPage({
  params,
  searchParams,
}: PageProps<"/consejos-agile/[slug]">) {
  const { slug } = await params;
  const { ok } = await searchParams;

  const council = await getAgileCouncilBySlug(slug);
  if (!council) notFound();

  const currentScouter = await getCurrentScouter();

  if (!currentScouter) {
    return (
      <main className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">{council.title}</h1>
          <Link href="/consejos-agile" className="text-sm text-muted hover:text-foreground">
            ← Consejos AGILE
          </Link>
        </div>
        <p className="text-sm text-muted">
          Inicia sesión con tu nombre arriba a la derecha para participar en
          este consejo.
        </p>
      </main>
    );
  }

  const rows = await dbAll<ResponseRow>(
    `SELECT r.council_id AS councilId, r.scouter_id AS scouterId, s.name AS scouterName,
            r.pag_social AS pagSocial, r.pag_ambiental AS pagAmbiental,
            r.pag_espiritual AS pagEspiritual, r.pag_salud AS pagSalud,
            r.calendar_reviewed AS calendarReviewed, r.calendar_comments AS calendarComments,
            r.chavales_excel_done AS chavalesExcelDone, r.chavales_comments AS chavalesComments,
            r.ruegos_preguntas AS ruegosPreguntas, r.submitted_at AS submittedAt
     FROM agile_council_responses r
     JOIN scouters s ON s.id = r.scouter_id
     WHERE r.council_id = ?
     ORDER BY r.submitted_at DESC`,
    [council.id],
  );

  // Los Row de libsql no son objetos planos — se reconstruyen campo a campo
  // (incluyendo los booleanos 0/1 -> boolean) antes de pasarlos al Client
  // Component del desplegable de respuestas.
  const responses: AgileCouncilResponse[] = rows.map((r) => ({
    councilId: r.councilId,
    scouterId: r.scouterId,
    scouterName: r.scouterName,
    pagSocial: r.pagSocial,
    pagAmbiental: r.pagAmbiental,
    pagEspiritual: r.pagEspiritual,
    pagSalud: r.pagSalud,
    calendarReviewed: r.calendarReviewed === 1,
    calendarComments: r.calendarComments,
    chavalesExcelDone: r.chavalesExcelDone === 1,
    chavalesComments: r.chavalesComments,
    ruegosPreguntas: r.ruegosPreguntas,
    submittedAt: r.submittedAt,
  }));

  const own = responses.find((r) => r.scouterId === currentScouter.scouterId) ?? null;
  const deadline = council.eventDate ? getAgileResponseDeadline(council.eventDate) : null;
  const deadlineLabel = deadline
    ? deadline.toLocaleString("es-ES", {
        timeZone: "Europe/Madrid",
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const deadlinePassed = council.eventDate ? !isAgileResponseWindowOpen(council) : false;

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      {council.methodologyLink && (
        <a
          href={council.methodologyLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit rounded-md border border-accent/50 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent/20"
        >
          📋 Nueva metodología de Consejos AGILE →
        </a>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">{council.title}</h1>
        <Link href="/consejos-agile" className="text-sm text-muted hover:text-foreground">
          ← Consejos AGILE
        </Link>
      </div>

      {council.eventDate && (
        <p className="text-sm text-muted">
          {new Date(council.eventDate).toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}

      <p className="rounded-md border border-branch-clan/50 bg-branch-clan/10 px-3 py-2 text-sm text-foreground">
        <strong>Importante:</strong> si no rellenas este formulario antes del
        consejo, <strong>tu participación en el consejo será limitada</strong>{" "}
        — para ser eficientes con el tiempo necesitamos que este trabajo esté
        hecho de antemano.
        {deadlineLabel && !own && (
          <>
            {" "}
            Tienes de plazo hasta el <strong>{deadlineLabel}</strong>.
          </>
        )}
      </p>

      {own ? (
        <p className="rounded-md border border-branch-tropa/40 bg-branch-tropa/10 px-3 py-2 text-sm text-foreground">
          <strong>✓ Ya has enviado tu participación</strong> (
          {new Date(own.submittedAt).toLocaleString("es-ES")}). Solo se admite
          un envío por persona — si quieres cambiar algo, edita el formulario
          de abajo y vuelve a pulsar el botón: se actualizará tu respuesta,
          no se duplicará.
        </p>
      ) : (
        <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted">
          Todavía no has enviado tu participación para este consejo. Solo
          puedes enviarla una vez, pero puedes editarla y reenviarla tantas
          veces como quieras antes del plazo.
        </p>
      )}

      {ok && (
        <p className="rounded-md border border-branch-tropa/40 bg-branch-tropa/10 px-3 py-2 text-sm text-foreground">
          ¡Gracias! Tu participación se ha guardado. Puedes reenviar el
          formulario si quieres cambiar algo.
        </p>
      )}

      <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-foreground">
        <strong>Ojo:</strong> las respuestas de este formulario son{" "}
        <strong>públicas para todo el kraal</strong> — cualquiera puede abrir
        el desplegable de abajo y ver lo que ha puesto cada uno, así todos
        vemos las propuestas antes del consejo.
      </p>

      <AgileCouncilResponsesToggle
        responses={responses}
        currentScouterId={currentScouter.scouterId}
      />

      <p className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted">
        En el propio consejo también se presentarán los miembros oficiales,
        cargos y comisiones — eso lo lleva la coordinación, no hace falta que
        rellenes nada sobre eso aquí.
      </p>

      <form action={submitAgileCouncilResponse} className="flex flex-col gap-6">
        <input type="hidden" name="councilId" value={council.id} />
        <input type="hidden" name="slug" value={council.slug} />

        <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium text-foreground">
            Propuesta de calendario
          </legend>
          {council.calendarLink || council.calendarDriveLink ? (
            <div className="flex flex-wrap gap-2">
              {council.calendarLink && (
                <a
                  href={council.calendarLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-fit rounded-md border border-accent px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent/10"
                >
                  Ver propuesta de calendario →
                </a>
              )}
              {council.calendarDriveLink && (
                <a
                  href={council.calendarDriveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-fit rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-accent"
                >
                  Ver también en Drive →
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Próximamente.</p>
          )}
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="calendarReviewed"
              value="1"
              defaultChecked={own?.calendarReviewed ?? false}
            />
            He revisado la propuesta de calendario
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-foreground">Comentarios sobre el calendario (opcional)</span>
            <textarea
              name="calendarComments"
              rows={2}
              defaultValue={own?.calendarComments ?? ""}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium text-foreground">Ideas para el PAG</legend>
          <p className="text-xs text-muted">
            Aporta tus ideas para cada ámbito del PAG. Buena parte de las
            ideas se pueden sacar directamente de las 8 bases del Proyecto de
            Coordinación 26/27 — échale un vistazo si no sabes por dónde
            empezar. También te puede ayudar consultar:
          </p>
          {council.pagReferenceLinks.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs">
              {council.pagReferenceLinks.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {link.label} →
                  </a>
                </li>
              ))}
            </ul>
          )}
          {AGILE_PAG_AMBITOS.map((ambito) => (
            <label key={ambito} className="flex flex-col gap-1">
              <span className="text-sm text-foreground">{AGILE_PAG_AMBITO_LABEL[ambito]}</span>
              <textarea
                name={`pag_${ambito}`}
                rows={2}
                defaultValue={
                  own
                    ? {
                        social: own.pagSocial,
                        ambiental: own.pagAmbiental,
                        espiritual: own.pagEspiritual,
                        salud: own.pagSalud,
                      }[ambito] ?? ""
                    : ""
                }
                placeholder={`Tus ideas de ámbito ${AGILE_PAG_AMBITO_LABEL[ambito].toLowerCase()}…`}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium text-foreground">
            Pasos de sección de chavales
          </legend>
          {council.chavalesExcelLink ? (
            <a
              href={council.chavalesExcelLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit rounded-md border border-accent px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent/10"
            >
              Abrir Excel de pasos de sección →
            </a>
          ) : (
            <p className="text-sm text-muted">Próximamente.</p>
          )}
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="chavalesExcelDone"
              value="1"
              defaultChecked={own?.chavalesExcelDone ?? false}
            />
            He rellenado el Excel de pasos de mi sección
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-foreground">Comentarios (opcional)</span>
            <textarea
              name="chavalesComments"
              rows={2}
              defaultValue={own?.chavalesComments ?? ""}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </label>
        </fieldset>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Ruego o pregunta adicional</span>
          <textarea
            name="ruegosPreguntas"
            rows={3}
            defaultValue={own?.ruegosPreguntas ?? ""}
            placeholder="Opcional — cualquier cosa que quieras plantear en el consejo."
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>

        <button
          type="submit"
          className={
            own
              ? "w-fit rounded-md border border-branch-tropa px-4 py-2 text-sm font-medium text-branch-tropa transition hover:bg-branch-tropa/10"
              : "w-fit rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/10"
          }
        >
          {own ? "✓ Actualizar mi participación" : "Enviar mi participación"}
        </button>
        {deadlinePassed && (
          <p className="text-xs text-muted">
            El plazo ({deadlineLabel}) ya ha pasado, pero puedes seguir
            enviando o corrigiendo tu respuesta.
          </p>
        )}
      </form>
    </main>
  );
}
