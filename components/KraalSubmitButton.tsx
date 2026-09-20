"use client";

import { useFormStatus } from "react-dom";

/** Botón relleno (no el estilo outline habitual del resto de la web) porque
 * es la única acción de la página que de verdad importa que no se pase por
 * alto — y con estado "Enviando…" via useFormStatus para que quede claro
 * que el clic sí ha hecho algo mientras se guarda en el servidor. */
export function KraalSubmitButton({ isUpdate }: { isUpdate: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="w-full rounded-lg bg-accent px-6 py-3 text-center text-base font-semibold text-background shadow-sm transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70 sm:w-fit sm:px-8"
    >
      {pending ? "Enviando…" : isUpdate ? "✓ Actualizar mi respuesta" : "📨 Enviar mi respuesta"}
    </button>
  );
}
