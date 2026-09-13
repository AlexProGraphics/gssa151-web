"use client";

import { useEffect, useState } from "react";
import { SURVEY_SUBMIT_DEADLINE_AT, SURVEY_SUBMIT_UNLOCK_AT } from "@/lib/types";

function msUntil(target: string) {
  return new Date(target).getTime() - Date.now();
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

const DEADLINE_LABEL = new Date(SURVEY_SUBMIT_DEADLINE_AT).toLocaleString("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * El envío ya está abierto (SURVEY_SUBMIT_UNLOCK_AT ya pasó) — esto muestra
 * la cuenta atrás hasta el cierre informativo (SURVEY_SUBMIT_DEADLINE_AT),
 * sin bloquear el botón: el plazo es un aviso, igual que en los consejos
 * AGILE, no un candado real. El candado real (por si el envío se vuelve a
 * bloquear a mano en el futuro) sigue viviendo en submitSurvey (servidor).
 */
export function SubmitCountdown() {
  // Server y cliente arrancan sin valor (evita discrepancias de
  // hidratación); en cuanto el efecto se suscribe al reloj, cada tick del
  // intervalo actualiza el estado — eso sí es la suscripción legítima a un
  // sistema externo, no un setState síncrono en el cuerpo del efecto.
  const [remainingToUnlock, setRemainingToUnlock] = useState<number | null>(null);
  const [remainingToClose, setRemainingToClose] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      setRemainingToUnlock(msUntil(SURVEY_SUBMIT_UNLOCK_AT));
      setRemainingToClose(msUntil(SURVEY_SUBMIT_DEADLINE_AT));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (remainingToUnlock === null || remainingToClose === null) return null;

  const locked = remainingToUnlock > 0;
  const closed = remainingToClose <= 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-accent/40 bg-accent/10 p-4">
      <p className="text-sm text-foreground">
        {locked ? (
          "El envío todavía no está abierto."
        ) : (
          <>
            El envío ya está abierto. Se cierra el <strong>{DEADLINE_LABEL}</strong>.
          </>
        )}
      </p>
      {!locked && !closed && (
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-surface px-3 py-2 font-mono text-lg tabular-nums text-foreground">
            {formatRemaining(remainingToClose)}
          </span>
          <span className="text-xs text-muted">hasta que se cierre el plazo</span>
        </div>
      )}
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
