"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateBoardSuggestion, logout } from "@/app/actions";

export function GenerateSuggestionButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await generateBoardSuggestion();
            setMessage(
              result.placed > 0
                ? `Sugerencia aplicada a ${result.placed} scouter(s) sin asignar.`
                : "No había huecos vacíos que rellenar.",
            );
            router.refresh();
          })
        }
        className="rounded-md border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-60"
      >
        {isPending ? "Generando…" : "Generar sugerencia"}
      </button>
      {message && <span className="text-xs text-muted">{message}</span>}
    </div>
  );
}

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={
          className ??
          "rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-foreground"
        }
      >
        Cerrar sesión
      </button>
    </form>
  );
}
