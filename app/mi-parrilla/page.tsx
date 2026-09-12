import Link from "next/link";
import { dbAll } from "@/lib/db";
import { getCurrentScouter } from "@/lib/auth";
import type { BoardCard, BoardUnit } from "@/lib/board";
import { Board } from "@/components/Board";
import { moveInProposal, submitProposal, unassignInProposal } from "@/app/actions";
import type { UnitCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

function SubmitProposalButton() {
  return (
    <form action={submitProposal}>
      <button
        type="submit"
        className="rounded-md border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
      >
        Enviar propuesta al kraal
      </button>
    </form>
  );
}

export default async function MiParrillaPage({
  searchParams,
}: PageProps<"/mi-parrilla">) {
  const { sent } = await searchParams;
  const scouter = await getCurrentScouter();

  if (!scouter) {
    return (
      <main className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
        <h1 className="text-xl font-semibold text-foreground">Crea tu parrilla</h1>
        <p className="text-sm text-muted">
          Inicia sesión con tu nombre arriba a la derecha para montar tu
          propia propuesta de parrilla.
        </p>
      </main>
    );
  }

  const units: BoardUnit[] = (
    await dbAll<{ id: string; name: string; category: UnitCategory; color: string; sortOrder: number }>(
      "SELECT id, name, category, color, sort_order AS sortOrder FROM units ORDER BY sort_order",
    )
  ).map((u) => ({ ...u }));

  const scouterRows = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM scouters WHERE active = 1 ORDER BY name",
  );

  const draftByScouter = new Map(
    (
      await dbAll<{ scouterId: string; unitId: string }>(
        "SELECT scouter_id AS scouterId, unit_id AS unitId FROM proposal_draft_assignments WHERE owner_id = ?",
        [scouter.scouterId],
      )
    ).map((a) => [a.scouterId, a.unitId]),
  );

  const cards: BoardCard[] = scouterRows.map((s) => ({
    scouterId: s.id,
    name: s.name,
    unitId: draftByScouter.get(s.id) ?? null,
  }));

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Crea tu parrilla</h1>
          <p className="text-sm text-muted">
            Coloca a cada scouter donde tú lo verías. Es tu propuesta
            personal — no toca la parrilla oficial hasta que la envíes al
            kraal.
          </p>
        </div>
        <Link href="/parrillas" className="text-sm text-muted hover:text-foreground">
          Ver parrilla oficial
        </Link>
      </div>

      {sent && (
        <p className="rounded-md border border-branch-tropa/40 bg-branch-tropa/10 px-3 py-2 text-sm text-foreground">
          Propuesta enviada al kraal. Puedes seguir retocándola y volver a
          enviarla cuando quieras.
        </p>
      )}

      <Board
        units={units}
        cards={cards}
        editable
        onMove={moveInProposal}
        onUnassign={unassignInProposal}
        whatsappTitle={`Propuesta de parrilla de ${scouter.name} — GSSA 151 2026/27`}
        excelHref="/api/export/excel/mi-parrilla"
        extraActions={<SubmitProposalButton />}
      />
    </main>
  );
}
