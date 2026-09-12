"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoginForm } from "./LoginForm";

const PANEL_WIDTH = 256;
const MARGIN = 16;
const GAP = 8;

export function LoginWidget({
  scouters,
  registeredIds,
}: {
  scouters: { id: string; name: string }[];
  registeredIds: string[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(Boolean(searchParams.get("loginError")));
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // El botón puede acabar en cualquier sitio de la cabecera según cómo
  // haga wrap en pantallas estrechas — anclar el panel con CSS relativo al
  // botón (centrado, right-0…) se salía de la pantalla en el móvil. Medir
  // la posición real y topar contra los bordes del viewport es lo único
  // que funciona seguro sea cual sea el ancho.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    function updatePosition() {
      const rect = buttonRef.current!.getBoundingClientRect();
      const panelWidth = Math.min(PANEL_WIDTH, window.innerWidth - MARGIN * 2);
      const left = Math.min(
        Math.max(MARGIN, rect.left),
        window.innerWidth - panelWidth - MARGIN,
      );
      setPos({ top: rect.bottom + GAP, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:border-accent"
      >
        Iniciar sesión
      </button>
      {open && pos && (
        <LoginForm
          scouters={scouters}
          registeredIds={registeredIds}
          nextPath={pathname}
          className="fixed z-20 flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-md border border-border bg-surface p-3 shadow-lg"
          style={{ top: pos.top, left: pos.left }}
        />
      )}
    </div>
  );
}
