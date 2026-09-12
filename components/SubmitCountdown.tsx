"use client";

import { useEffect, useState } from "react";
import { SURVEY_SUBMIT_UNLOCK_AT } from "@/lib/types";

function msUntilUnlock() {
  return new Date(SURVEY_SUBMIT_UNLOCK_AT).getTime() - Date.now();
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * El botón de enviar se desbloquea solo, sin recargar, en cuanto el reloj
 * del navegador cruza SURVEY_SUBMIT_UNLOCK_AT. El bloqueo real vive en
 * submitSurvey (servidor) — esto es solo para que el usuario vea la cuenta
 * atrás y no se encuentre el botón deshabilitado sin explicación.
 */
export function SubmitCountdown() {
  // Server y cliente arrancan sin valor (evita discrepancias de
  // hidratación); en cuanto el efecto se suscribe al reloj, cada tick del
  // intervalo actualiza el estado — eso sí es la suscripción legítima a un
  // sistema externo, no un setState síncrono en el cuerpo del efecto.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(msUntilUnlock());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (remaining === null) return null;

  const locked = remaining > 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-accent/40 bg-accent/10 p-4">
      <p className="text-sm text-foreground">
        <strong>Aún estamos afinando el sistema de budget y la encuesta.</strong>{" "}
        Puedes rellenarlo todo y guardarlo ya, pero el envío definitivo se
        abre mañana a las 12:00 para dar tiempo a cerrar bien los últimos
        detalles.
      </p>
      {locked ? (
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-surface px-3 py-2 font-mono text-lg tabular-nums text-foreground">
            {formatRemaining(remaining)}
          </span>
          <span className="text-xs text-muted">hasta que se pueda enviar</span>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={locked}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-40"
      >
        {locked ? "Enviar (bloqueado)" : "Enviar"}
      </button>
    </div>
  );
}
