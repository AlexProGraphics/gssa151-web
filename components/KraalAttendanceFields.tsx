"use client";

import { useState } from "react";

/** Campos de llegada/salida solo tienen sentido si vienes — se ocultan (no
 * solo se deshabilitan) en cuanto marcas que no vienes, para no pedir datos
 * que no aplican. Mismo patrón que otros campos condicionales de la
 * encuesta (ver PointsBudgetFields/FavoritesField). */
export function KraalAttendanceFields({
  initialAttending,
  initialArrivalNote,
  initialStaysUntilEnd,
  initialDepartureNote,
}: {
  initialAttending: "si" | "no";
  initialArrivalNote: string;
  initialStaysUntilEnd: boolean;
  initialDepartureNote: string;
}) {
  const [attending, setAttending] = useState<"si" | "no">(initialAttending);
  const [staysUntilEnd, setStaysUntilEnd] = useState(initialStaysUntilEnd);

  return (
    <>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">¿Vienes a la salida?</legend>
        <div className="flex gap-4 text-sm text-foreground">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="attending"
              value="si"
              checked={attending === "si"}
              onChange={() => setAttending("si")}
            />
            Sí, voy
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="attending"
              value="no"
              checked={attending === "no"}
              onChange={() => setAttending("no")}
            />
            No puedo ir
          </label>
        </div>
      </fieldset>

      {attending === "si" && (
        <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium text-foreground">Llegada y salida</legend>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-foreground">¿Cuándo llegas?</span>
            <input
              type="text"
              name="arrivalNote"
              defaultValue={initialArrivalNote}
              placeholder="Ej: viernes con el grupo a las 19:00, o llego por mi cuenta el sábado por la mañana…"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="staysUntilEnd"
              value="1"
              checked={staysUntilEnd}
              onChange={(e) => setStaysUntilEnd(e.target.checked)}
            />
            Me quedo hasta el final (domingo, comida incluida)
          </label>
          {!staysUntilEnd && (
            <label className="flex flex-col gap-1">
              <span className="text-sm text-foreground">¿Cuándo te vas?</span>
              <input
                type="text"
                name="departureNote"
                defaultValue={initialDepartureNote}
                placeholder="Ej: domingo después de comer, o sábado por la noche…"
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
            </label>
          )}
        </fieldset>
      )}
    </>
  );
}
