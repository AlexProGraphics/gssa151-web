"use client";

import { setAgileCouncilActive, deleteAgileCouncil } from "@/app/actions";

export function AgileCouncilDangerActions({
  councilId,
  councilTitle,
  active,
}: {
  councilId: string;
  councilTitle: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <form action={setAgileCouncilActive}>
        <input type="hidden" name="councilId" value={councilId} />
        <input type="hidden" name="active" value={active ? "0" : "1"} />
        <button
          type="submit"
          className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:border-accent"
        >
          {active ? "Ocultar" : "Mostrar de nuevo"}
        </button>
      </form>
      <form
        action={deleteAgileCouncil}
        onSubmit={(e) => {
          if (
            !confirm(
              `¿Eliminar "${councilTitle}" definitivamente? Se borrarán también todas sus respuestas. Esto no se puede deshacer — si solo quieres que deje de verse, usa "Ocultar".`,
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="councilId" value={councilId} />
        <button
          type="submit"
          className="rounded-md border border-branch-clan/50 px-2 py-1 text-xs text-branch-clan hover:bg-branch-clan/10"
        >
          Eliminar
        </button>
      </form>
    </div>
  );
}
