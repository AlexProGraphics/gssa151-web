import { redirect } from "next/navigation";
import { dbAll } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import type { BoardCard, BoardUnit } from "@/lib/board";
import { Board } from "@/components/Board";
import { moveScouter, unassignScouter } from "@/app/actions";
import { GenerateSuggestionButton } from "@/components/AdminActions";
import type { UnitCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadBoardData() {
  const units: BoardUnit[] = (
    await dbAll<{ id: string; name: string; category: UnitCategory; color: string; sortOrder: number }>(
      "SELECT id, name, category, color, sort_order AS sortOrder FROM units ORDER BY sort_order",
    )
  ).map((u) => ({ id: u.id, name: u.name, category: u.category, color: u.color, sortOrder: u.sortOrder }));

  const scouterRows = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM scouters WHERE active = 1 ORDER BY name",
  );

  const unitByScouter = new Map(
    (
      await dbAll<{ scouterId: string; unitId: string }>(
        "SELECT scouter_id AS scouterId, unit_id AS unitId FROM assignments",
      )
    ).map((a) => [a.scouterId, a.unitId]),
  );

  const cards: BoardCard[] = scouterRows.map((s) => ({
    scouterId: s.id,
    name: s.name,
    unitId: unitByScouter.get(s.id) ?? null,
  }));

  return { units, cards };
}

export default async function AdminBoardPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login?next=/admin/board");

  const { units, cards } = await loadBoardData();

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Tablero admin · Parrilla 2026/27
        </h1>
        <p className="text-sm text-muted">
          Arrastra o selecciona una tarjeta y luego pulsa la unidad
          destino. Los cambios se guardan al instante.
        </p>
      </div>
      <Board
        units={units}
        cards={cards}
        editable
        onMove={moveScouter}
        onUnassign={unassignScouter}
        extraActions={<GenerateSuggestionButton />}
      />
    </main>
  );
}
