import Link from "next/link";
import { redirect } from "next/navigation";
import { dbAll } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { CATEGORY_LABEL, type UnitCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminUnitsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login?next=/admin/units");

  const units = await dbAll<{ id: string; name: string; category: UnitCategory; color: string }>(
    "SELECT id, name, category, color, sort_order FROM units ORDER BY sort_order",
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Unidades</h1>
        <Link href="/admin/board" className="text-sm text-muted hover:text-foreground">
          ← Tablero
        </Link>
      </div>
      <p className="text-sm text-muted">
        Las 10 unidades del grupo. Para cambiar nombres/colores de momento
        se edita directamente el archivo <code>lib/seedData.ts</code> (o la
        tabla <code>units</code> del fichero <code>data/gssa151.db</code>).
      </p>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {units.map((unit) => (
          <li key={unit.id} className="flex items-center gap-3 p-3">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: unit.color }}
            />
            <span className="text-sm font-medium text-foreground">{unit.name}</span>
            <span className="ml-auto text-xs text-muted">
              {CATEGORY_LABEL[unit.category]}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
