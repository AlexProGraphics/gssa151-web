import Link from "next/link";
import { Suspense } from "react";
import { dbAll } from "@/lib/db";
import { getCurrentAdmin, getCurrentScouter } from "@/lib/auth";
import { LoginWidget } from "./LoginWidget";
import { LogoutButton, ScouterLogoutButton } from "./AdminActions";
import { AdminNavDropdown } from "./AdminNavDropdown";

const NAV_LINK = "text-muted hover:text-foreground";

export async function SiteHeader() {
  const [admin, scouter] = await Promise.all([getCurrentAdmin(), getCurrentScouter()]);

  // El widget deja acceder al rol que aún falte (admin y scouter son
  // sesiones independientes) — solo se oculta cuando ya tienes las dos.
  let scouters: { id: string; name: string }[] = [];
  if (!admin || !scouter) {
    const rows = await dbAll<{ id: string; name: string }>(
      "SELECT id, name FROM scouters WHERE active = 1 ORDER BY name",
    );
    // Los Row de libsql (como antes los de node:sqlite) no son objetos
    // planos — hay que plain-ificarlos antes de pasarlos a un Client
    // Component, o React se niega a serializarlos como props.
    scouters = rows.map((r) => ({ id: r.id, name: r.name }));
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
        {admin && (
          <>
            <span className="text-muted">
              Admin: <span className="text-foreground">{admin.name}</span>
            </span>
            <LogoutButton />
          </>
        )}
        {scouter && (
          <>
            <span className="text-muted">
              Hola, <span className="text-foreground">{scouter.name}</span>
            </span>
            <ScouterLogoutButton />
          </>
        )}
        {(!admin || !scouter) && (
          <Suspense fallback={null}>
            <LoginWidget scouters={scouters} />
          </Suspense>
        )}
      </div>
    </header>
  );
}
