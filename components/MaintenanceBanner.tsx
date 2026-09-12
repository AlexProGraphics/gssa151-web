"use client";

import { useEffect, useState } from "react";
import { SITE_MAINTENANCE_UNTIL } from "@/lib/types";

/**
 * Aviso temporal en todas las páginas mientras se termina de pulir la
 * encuesta y el sistema de budget. Se autooculta solo (sin recargar) en
 * cuanto pasa SITE_MAINTENANCE_UNTIL — igual que SubmitCountdown, arranca
 * en null y solo el intervalo del efecto actualiza el estado, para no
 * disparar un setState síncrono en el cuerpo del efecto.
 */
export function MaintenanceBanner() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(new Date(SITE_MAINTENANCE_UNTIL).getTime() - Date.now());
    tick();
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (remaining === null || remaining <= 0) return null;

  return (
    <div className="border-b border-accent/40 bg-accent/10 px-6 py-2 text-center text-sm text-foreground">
      <strong>Web en construcción:</strong> estamos terminando de pulir la
      encuesta y el sistema de budget — todo estará cerrado mañana a las
      12:00.
    </div>
  );
}
