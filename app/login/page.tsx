import { dbAll } from "@/lib/db";
import { unifiedLogin } from "@/app/actions";

export const dynamic = "force-dynamic";

const ERROR_MESSAGE: Record<string, string> = {
  missing: "Elige tu nombre y escribe una contraseña.",
  invalid: "Esa persona no existe o no está activa.",
  wrong: "Contraseña incorrecta.",
  short: "La contraseña debe tener al menos 6 caracteres.",
  mismatch: "Las dos contraseñas no coinciden.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, loginError } = await searchParams;
  const nextPath = typeof next === "string" ? next : "/";
  const errorMessage = typeof loginError === "string" ? ERROR_MESSAGE[loginError] : undefined;

  const scouters = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM scouters WHERE active = 1 ORDER BY name",
  );

  return (
    <main className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-muted">
          Elige tu nombre. Si es la primera vez, la contraseña que escribas
          se queda fijada como la tuya. Los dos admins del grupo (Gabi y
          Alex Muñoz) entran igual, con su contraseña de admin.
        </p>
      </div>
      <form action={unifiedLogin} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={nextPath} />
        <select
          name="scouterId"
          required
          defaultValue=""
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
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
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Repite la contraseña (solo tu 1ª vez)"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        {errorMessage && <p className="text-sm text-branch-clan">{errorMessage}</p>}
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-background"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
