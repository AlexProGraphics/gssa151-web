"use client";

import { useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { unifiedLogin } from "@/app/actions";

const ERROR_MESSAGE: Record<string, string> = {
  missing: "Elige tu nombre y escribe una contraseña.",
  invalid: "Esa persona no existe o no está activa.",
  wrong: "Contraseña incorrecta.",
  short: "La contraseña debe tener al menos 6 caracteres.",
  mismatch: "Las dos contraseñas no coinciden.",
};

export function LoginForm({
  scouters,
  registeredIds,
  nextPath,
  className,
  style,
  fieldClassName = "rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground",
}: {
  scouters: { id: string; name: string }[];
  registeredIds: string[];
  nextPath: string;
  className?: string;
  style?: CSSProperties;
  /** Ajusta el fondo del campo al contenedor: bg-background dentro de un
   * popover bg-surface (por defecto), o bg-surface en una página normal. */
  fieldClassName?: string;
}) {
  const searchParams = useSearchParams();
  const error = searchParams.get("loginError");
  const [scouterId, setScouterId] = useState("");

  const registered = new Set(registeredIds);
  // La confirmación solo tiene sentido la primera vez que alguien reclama
  // su identidad — si ya tiene cuenta (o aún no ha elegido nombre), no la
  // pedimos.
  const isFirstTime = scouterId !== "" && !registered.has(scouterId);

  return (
    <form action={unifiedLogin} className={className} style={style}>
      <input type="hidden" name="next" value={nextPath} />
      <select
        name="scouterId"
        required
        value={scouterId}
        onChange={(e) => setScouterId(e.target.value)}
        className={fieldClassName}
      >
        <option value="" disabled>
          Elige tu nombre
        </option>
        {scouters.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input
        type="password"
        name="password"
        required
        placeholder="Contraseña"
        className={fieldClassName}
      />
      {isFirstTime && (
        <input
          type="password"
          name="confirmPassword"
          placeholder="Repite la contraseña (primera vez)"
          className={fieldClassName}
        />
      )}
      {error && (
        <p className="text-xs text-branch-clan">{ERROR_MESSAGE[error] ?? "Ha ocurrido un error."}</p>
      )}
      <button
        type="submit"
        className="rounded-md bg-accent px-2 py-1.5 text-sm font-medium text-background"
      >
        Entrar
      </button>
    </form>
  );
}
