"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { unifiedLogin } from "@/app/actions";

const ERROR_MESSAGE: Record<string, string> = {
  missing: "Elige tu nombre y escribe una contraseña.",
  invalid: "Esa persona no existe o no está activa.",
  wrong: "Contraseña incorrecta.",
  short: "La contraseña debe tener al menos 6 caracteres.",
  mismatch: "Las dos contraseñas no coinciden.",
};

export function LoginWidget({ scouters }: { scouters: { id: string; name: string }[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const error = searchParams.get("loginError");
  const [open, setOpen] = useState(Boolean(error));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:border-accent"
      >
        Iniciar sesión
      </button>
      {open && (
        <form
          action={unifiedLogin}
          className="absolute right-0 top-full z-10 mt-2 flex w-64 flex-col gap-2 rounded-md border border-border bg-surface p-3 shadow-lg"
        >
          <input type="hidden" name="next" value={pathname} />
          <select
            name="scouterId"
            required
            defaultValue=""
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
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
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Repite (solo tu 1ª vez)"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
          {error && (
            <p className="text-xs text-branch-clan">
              {ERROR_MESSAGE[error] ?? "Ha ocurrido un error."}
            </p>
          )}
          <button
            type="submit"
            className="rounded-md bg-accent px-2 py-1.5 text-sm font-medium text-background"
          >
            Entrar
          </button>
        </form>
      )}
    </div>
  );
}
