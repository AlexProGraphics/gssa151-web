import { redirect } from "next/navigation";
import { dbAll } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { addScouter, adminResetScouterPassword, upsertScouterScore } from "@/app/actions";
import { ScouterDangerActions } from "@/components/ScouterDangerActions";

export const dynamic = "force-dynamic";

export default async function AdminScoutersPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login?next=/admin/scouters");

  const scouters = await dbAll<{ id: string; name: string; active: number }>(
    "SELECT id, name, active FROM scouters ORDER BY name",
  );

  const scores = await dbAll<{
    scouter_id: string;
    birth_year: number | null;
    mtl_status: string | null;
    total_experience_years: number | null;
    confianza: number | null;
    lider_score: number | null;
  }>("SELECT * FROM scouter_scores");
  const scoreByScouter = new Map(scores.map((s) => [s.scouter_id, s]));

  const registeredIds = new Set(
    (await dbAll<{ scouter_id: string }>("SELECT scouter_id FROM scouter_users")).map(
      (r) => r.scouter_id,
    ),
  );

  const adminIds = new Set(
    (await dbAll<{ scouter_id: string }>("SELECT scouter_id FROM admin_users")).map(
      (r) => r.scouter_id,
    ),
  );

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-foreground">Scouters y puntuación</h1>
      <p className="text-sm text-muted">
        Información confidencial — solo visible aquí, nunca en la vista
        pública ni en los exports.
      </p>

      <form action={addScouter} className="flex gap-2">
        <input
          type="text"
          name="name"
          required
          placeholder="Nombre del nuevo scouter"
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
        <button
          type="submit"
          className="rounded-md border border-accent px-3 py-2 text-sm font-medium text-accent"
        >
          Añadir
        </button>
      </form>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {scouters.map((scouter) => {
          const score = scoreByScouter.get(scouter.id);
          const registered = registeredIds.has(scouter.id);
          const isAdmin = adminIds.has(scouter.id);
          const active = scouter.active === 1;
          return (
            <div key={scouter.id} className={active ? undefined : "opacity-60"}>
            <form
              action={upsertScouterScore}
              className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-6"
            >
              <input type="hidden" name="scouterId" value={scouter.id} />
              <div className="col-span-2 flex items-center gap-2 text-sm font-medium text-foreground sm:col-span-1">
                {scouter.name}
                {!active && (
                  <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-muted">
                    Oculto
                  </span>
                )}
              </div>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Año
                <input
                  type="number"
                  name="birthYear"
                  defaultValue={score?.birth_year ?? ""}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                MTL
                <select
                  name="mtlStatus"
                  defaultValue={score?.mtl_status ?? ""}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
                >
                  <option value="">—</option>
                  <option value="SI">SÍ</option>
                  <option value="NO">NO</option>
                  <option value="EN_CURSO">En curso</option>
                  <option value="NO_SE">No se sabe</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Exp. total
                <input
                  type="number"
                  step="0.5"
                  name="totalExperienceYears"
                  defaultValue={score?.total_experience_years ?? ""}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Confianza (1-3)
                <input
                  type="number"
                  min={1}
                  max={3}
                  name="confianza"
                  defaultValue={score?.confianza ?? ""}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Líder (1-3)
                <input
                  type="number"
                  min={1}
                  max={3}
                  name="liderScore"
                  defaultValue={score?.lider_score ?? ""}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
                />
              </label>
              <button
                type="submit"
                className="col-span-2 mt-1 self-start rounded-md border border-border px-3 py-1 text-xs text-foreground hover:border-accent sm:col-span-6"
              >
                Guardar
              </button>
            </form>
            <div className="flex items-center gap-3 border-t border-border/60 bg-surface/50 px-4 py-2">
              <span className="text-xs text-muted">
                Encuesta:{" "}
                {registered ? (
                  <span className="text-foreground">registrado</span>
                ) : (
                  "sin registrar todavía"
                )}
              </span>
              {registered && (
                <form action={adminResetScouterPassword} className="flex flex-1 gap-2">
                  <input type="hidden" name="scouterId" value={scouter.id} />
                  <input
                    type="password"
                    name="newPassword"
                    required
                    minLength={6}
                    placeholder="Nueva contraseña (mín. 6)"
                    className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
                  />
                  <button
                    type="submit"
                    className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:border-accent"
                  >
                    Resetear contraseña
                  </button>
                </form>
              )}
              <div className="ml-auto">
                <ScouterDangerActions
                  scouterId={scouter.id}
                  scouterName={scouter.name}
                  active={active}
                  isAdmin={isAdmin}
                />
              </div>
            </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
