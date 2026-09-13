import Link from "next/link";
import { getCurrentScouter } from "@/lib/auth";
import { listAgileCouncils, listPendingAgileCouncilIds } from "@/lib/agileCouncils";

export const dynamic = "force-dynamic";

export default async function ConsejosAgilePage() {
  const currentScouter = await getCurrentScouter();

  if (!currentScouter) {
    return (
      <main className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Consejos AGILE</h1>
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← Inicio
          </Link>
        </div>
        <p className="text-sm text-muted">
          Inicia sesión con tu nombre arriba a la derecha para ver los
          consejos AGILE y participar en ellos.
        </p>
      </main>
    );
  }

  const [councils, pendingIds] = await Promise.all([
    listAgileCouncils({ onlyActive: true }),
    listPendingAgileCouncilIds(currentScouter.scouterId),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Consejos AGILE</h1>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Inicio
        </Link>
      </div>
      <p className="text-sm text-muted">
        Elige un consejo para ver su información y rellenar tu participación.
      </p>

      {councils.length === 0 ? (
        <p className="rounded-md border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          Todavía no hay ningún consejo AGILE publicado.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {councils.map((council) => (
            <li key={council.id}>
              <Link
                href={`/consejos-agile/${council.slug}`}
                className="flex items-center justify-between gap-3 p-4 hover:bg-surface"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {council.title}
                  {pendingIds.has(council.id) && (
                    <span className="rounded-full border border-branch-clan/50 bg-branch-clan/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-branch-clan">
                      Pendiente
                    </span>
                  )}
                </span>
                {council.eventDate && (
                  <span className="text-xs text-muted">
                    {new Date(council.eventDate).toLocaleDateString("es-ES", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
