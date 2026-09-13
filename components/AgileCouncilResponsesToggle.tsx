"use client";

import { useState } from "react";
import { AGILE_PAG_AMBITOS, AGILE_PAG_AMBITO_LABEL, type AgileCouncilResponse } from "@/lib/types";

/** Desplegable "Ver respuestas de los demás" — todas las respuestas de este
 * consejo son públicas para el kraal (ver disclaimer en la página), así que
 * cualquier scouter logueado puede abrir esto y ver lo que ha puesto cada
 * uno. Colapsado por defecto para no saturar la página con el formulario. */
export function AgileCouncilResponsesToggle({
  responses,
  currentScouterId,
}: {
  responses: AgileCouncilResponse[];
  currentScouterId: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = responses.filter((r) =>
    r.scouterName.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground"
      >
        <span>
          Ver respuestas de los demás{" "}
          <span className="text-muted">({responses.length})</span>
        </span>
        <span aria-hidden className="text-xs text-muted">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border p-4">
          {responses.length === 0 ? (
            <p className="text-sm text-muted">
              Todavía no hay ninguna respuesta enviada para este consejo.
            </p>
          ) : (
            <>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre…"
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
              <div className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto pr-1">
                {filtered.map((r) => (
                  <ResponseCard
                    key={r.scouterId}
                    response={r}
                    isYou={r.scouterId === currentScouterId}
                  />
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted">Nadie con ese nombre.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResponseCard({
  response,
  isYou,
}: {
  response: AgileCouncilResponse;
  isYou: boolean;
}) {
  const pagByAmbito: Record<string, string | null> = {
    social: response.pagSocial,
    ambiental: response.pagAmbiental,
    espiritual: response.pagEspiritual,
    salud: response.pagSalud,
  };
  const hasAnyPag = AGILE_PAG_AMBITOS.some((a) => pagByAmbito[a]);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">
          {response.scouterName}
          {isYou && <span className="ml-1.5 text-xs text-accent">(tú)</span>}
        </span>
        <span className="text-xs text-muted">
          {new Date(response.submittedAt).toLocaleString("es-ES")}
        </span>
      </div>

      {hasAnyPag && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Ideas para el PAG</span>
          {AGILE_PAG_AMBITOS.filter((a) => pagByAmbito[a]).map((a) => (
            <p key={a} className="text-foreground">
              <span className="text-muted">{AGILE_PAG_AMBITO_LABEL[a]}:</span> {pagByAmbito[a]}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <span>{response.calendarReviewed ? "✓ Calendario revisado" : "— Calendario sin revisar"}</span>
        <span>
          {response.chavalesExcelDone ? "✓ Excel de chavales rellenado" : "— Excel de chavales pendiente"}
        </span>
      </div>
      {response.calendarComments && (
        <p className="text-foreground">
          <span className="text-muted text-xs">Sobre el calendario:</span> {response.calendarComments}
        </p>
      )}
      {response.chavalesComments && (
        <p className="text-foreground">
          <span className="text-muted text-xs">Sobre pasos de sección:</span> {response.chavalesComments}
        </p>
      )}
      {response.ruegosPreguntas && (
        <p className="text-foreground">
          <span className="text-muted text-xs">Ruegos y preguntas:</span> {response.ruegosPreguntas}
        </p>
      )}
    </div>
  );
}
