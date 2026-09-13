import Link from "next/link";
import { dbAll } from "@/lib/db";
import type { BoardCard, BoardUnit } from "@/lib/board";
import { UNASSIGNED_COLUMN_ID } from "@/lib/board";
import { UnitDashboard } from "@/components/UnitDashboard";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { ShareWhatsappButton } from "@/components/ShareWhatsappButton";
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

export default async function ParrillasPage() {
  const { units, cards } = await loadBoardData();

  const cardsByUnit = new Map<string, BoardCard[]>();
  cardsByUnit.set(UNASSIGNED_COLUMN_ID, []);
  for (const unit of units) cardsByUnit.set(unit.id, []);
  for (const card of cards) {
    const key = card.unitId ?? UNASSIGNED_COLUMN_ID;
    cardsByUnit.get(key)?.push(card);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Parrilla Kraal · Ronda 2026/27
          </h1>
          <p className="text-sm text-muted">
            Vista pública — solo se muestra a qué unidad pertenece cada
            scouter.
          </p>
        </div>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Inicio
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ShareWhatsappButton units={units} cardsByUnit={cardsByUnit} />
        <ExportExcelButton />
      </div>
      <UnitDashboard units={units} cardsByUnit={cardsByUnit} />
    </main>
  );
}
