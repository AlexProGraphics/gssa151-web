import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { listAgileCouncils } from "@/lib/agileCouncils";
import { createAgileCouncil } from "@/app/actions";
import { AgileCouncilDangerActions } from "@/components/AgileCouncilDangerActions";

export const dynamic = "force-dynamic";

export default async function AdminAgileCouncilsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login?next=/admin/consejos-agile");

  const councils = await listAgileCouncils();

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Consejos AGILE</h1>
        <Link href="/admin/board" className="text-sm text-muted hover:text-foreground">
          ← Tablero
        </Link>
      </div>
      <p className="text-sm text-muted">
        Cada consejo nuevo reusa automáticamente el mismo formulario de
        participación (calendario, ideas de PAG, pasos de sección de
        chavales, ruegos) en <code>/consejos-agile/[slug]</code> — no hace
        falta tocar código.
      </p>

      <form
        action={createAgileCouncil}
        className="flex flex-col gap-3 rounded-lg border border-border p-4"
      >
        <h2 className="text-sm font-medium text-foreground">Nuevo consejo</h2>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Título</span>
          <input
            type="text"
            name="title"
            required
            placeholder="Ej: Smooth Planning 19/9"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Fecha (opcional)</span>
          <input
            type="date"
            name="eventDate"
            className="w-48 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">
            Enlace a la metodología del consejo (opcional)
          </span>
          <input
            type="url"
            name="methodologyLink"
            placeholder="https://…"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Enlace a la propuesta de calendario (opcional)</span>
          <input
            type="url"
            name="calendarLink"
            placeholder="https://…"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">
            Enlace alternativo al calendario en Drive (opcional)
          </span>
          <input
            type="url"
            name="calendarDriveLink"
            placeholder="https://…"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">
            Enlace al Excel de pasos de sección de chavales (opcional)
          </span>
          <input
            type="url"
            name="chavalesExcelLink"
            placeholder="https://…"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">
            Enlaces de referencia para el PAG (opcional) — uno por línea, formato{" "}
            <code>Etiqueta | URL</code>
          </span>
          <textarea
            name="pagReferenceLinks"
            rows={3}
            placeholder={"Carpeta de PAGs históricos | https://…\nProyecto de coordinación | https://…"}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>
        <button
          type="submit"
          className="w-fit rounded-md border border-accent px-3 py-2 text-sm font-medium text-accent"
        >
          Crear consejo
        </button>
      </form>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {councils.length === 0 && (
          <p className="p-4 text-sm text-muted">Todavía no hay ningún consejo creado.</p>
        )}
        {councils.map((council) => (
          <div
            key={council.id}
            className={`flex items-center justify-between gap-3 p-4 ${council.active ? "" : "opacity-60"}`}
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{council.title}</span>
                {!council.active && (
                  <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-muted">
                    Oculto
                  </span>
                )}
              </div>
              <Link
                href={`/consejos-agile/${council.slug}`}
                className="text-xs text-muted hover:text-foreground"
              >
                /consejos-agile/{council.slug} →
              </Link>
            </div>
            <AgileCouncilDangerActions
              councilId={council.id}
              councilTitle={council.title}
              active={council.active}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
