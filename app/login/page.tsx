import { dbAll } from "@/lib/db";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : "/";

  const [scouterRows, registeredRows, adminRows] = await Promise.all([
    dbAll<{ id: string; name: string }>(
      "SELECT id, name FROM scouters WHERE active = 1 ORDER BY name",
    ),
    dbAll<{ scouter_id: string }>("SELECT scouter_id FROM scouter_users"),
    dbAll<{ scouter_id: string }>("SELECT scouter_id FROM admin_users"),
  ]);
  // Los Row de libsql no son objetos planos — hay que plain-ificarlos antes
  // de pasarlos a un Client Component, o React se niega a serializarlos.
  const scouters = scouterRows.map((r) => ({ id: r.id, name: r.name }));
  // Los admins también cuentan como "ya registrados" — su contraseña es
  // fija, nunca pasan por el formulario de "repite contraseña".
  const registeredIds = [...registeredRows, ...adminRows].map((r) => r.scouter_id);

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
      <LoginForm
        scouters={scouters}
        registeredIds={registeredIds}
        nextPath={nextPath}
        className="flex flex-col gap-3"
        fieldClassName="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
      />
    </main>
  );
}
