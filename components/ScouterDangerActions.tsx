"use client";

import { setScouterHidden, deleteScouter } from "@/app/actions";

export function ScouterDangerActions({
  scouterId,
  scouterName,
  active,
  isAdmin,
}: {
  scouterId: string;
  scouterName: string;
  active: boolean;
  isAdmin: boolean;
}) {
  if (isAdmin) {
    return <span className="text-xs text-muted">Admin — no se puede ocultar ni eliminar</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <form action={setScouterHidden}>
        <input type="hidden" name="scouterId" value={scouterId} />
        <input type="hidden" name="hidden" value={active ? "1" : "0"} />
        <button
          type="submit"
          className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:border-accent"
        >
          {active ? "Ocultar" : "Mostrar de nuevo"}
        </button>
      </form>
      <form
        action={deleteScouter}
        onSubmit={(e) => {
          if (
            !confirm(
              `¿Eliminar a ${scouterName} definitivamente? Se borrará también su encuesta, propuestas y asignaciones. Esto no se puede deshacer — si solo quieres que deje de verse, usa "Ocultar".`,
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="scouterId" value={scouterId} />
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
