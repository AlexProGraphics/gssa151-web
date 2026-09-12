import Link from "next/link";
import { Suspense } from "react";
import { dbAll } from "@/lib/db";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth";
import { LoginWidget } from "./LoginWidget";
import { LogoutButton } from "./AdminActions";
import { AdminNavDropdown } from "./AdminNavDropdown";

const NAV_LINK = "text-muted hover:text-foreground";

export async function SiteHeader() {
  // Una sola sesión por persona: "admin" es el mismo usuario con permisos
  // extra, no un login aparte — por eso basta con comprobar getCurrentUser
  // para saber si hay alguien logueado, y getCurrentAdmin solo añade el
  // panel/badge de admin cuando corresponde.
  const [user, admin] = await Promise.all([getCurrentUser(), getCurrentAdmin()]);

  let scouters: { id: string; name: string }[] = [];
  let registeredIds: string[] = [];
  if (!user) {
    const [rows, registeredRows, adminRows] = await Promise.all([
      dbAll<{ id: string; name: string }>(
        "SELECT id, name FROM scouters WHERE active = 1 ORDER BY name",
      ),
      dbAll<{ scouter_id: string }>("SELECT scouter_id FROM scouter_users"),
      dbAll<{ scouter_id: string }>("SELECT scouter_id FROM admin_users"),
    ]);
    // Los Row de libsql (como antes los de node:sqlite) no son objetos
    // planos — hay que plain-ificarlos antes de pasarlos a un Client
    // Component, o React se niega a serializarlos como props.
    scouters = rows.map((r) => ({ id: r.id, name: r.name }));
    // Los admins también cuentan como "ya registrados" — su contraseña es
    // fija, nunca pasan por el formulario de "repite contraseña".
    registeredIds = [...registeredRows, ...adminRows].map((r) => r.scouter_id);
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/" className="text-sm font-semibold text-foreground">
          GSSA 151
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/parrillas" className={NAV_LINK}>
            Parrillas
          </Link>
          <Link href="/encuesta" className={NAV_LINK}>
            Encuesta
          </Link>
          <Link href="/mi-parrilla" className={NAV_LINK}>
            Crea tu parrilla
          </Link>
          {/* Solo visible logueado como admin — nadie más lo ve ni puede entrar. */}
          {admin && <AdminNavDropdown />}
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {user && (
          <>
            <span className="text-muted">
              Hola, <span className="text-foreground">{user.name}</span>
              {admin && <span className="ml-1 text-xs text-accent">(admin)</span>}
            </span>
            <LogoutButton />
          </>
        )}
        {!user && (
          <Suspense fallback={null}>
            <LoginWidget scouters={scouters} registeredIds={registeredIds} />
          </Suspense>
        )}
      </div>
    </header>
  );
}
