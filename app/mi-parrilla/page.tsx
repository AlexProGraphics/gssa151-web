import Link from "next/link";
import { dbAll, dbGet } from "@/lib/db";
import { getCurrentScouter } from "@/lib/auth";
import type { BoardCard, BoardUnit } from "@/lib/board";
import { Board } from "@/components/Board";
import { moveInProposal, unassignInProposal } from "@/app/actions";
import { SubmitProposalButton } from "@/components/SubmitProposalButton";
import type { UnitCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MiParrillaPage({
  searchParams,
}: PageProps<"/mi-parrilla">) {
  const { sent, error } = await searchParams;
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
  ).map((u) => ({ id: u.id, name: u.name, category: u.category, color: u.color, sortOrder: u.sortOrder }));

  const scouterRows = await dbAll<{ id: string; name: string }>(
    "SELECT id, name FROM scouters WHERE active = 1 ORDER BY name",
  );

  const draftRows = await dbAll<{ scouterId: string; unitId: string }>(
    "SELECT scouter_id AS scouterId, unit_id AS unitId FROM proposal_draft_assignments WHERE owner_id = ?",
    [scouter.scouterId],
  );
  const draftByScouter = new Map(draftRows.map((a) => [a.scouterId, a.unitId]));

  const cards: BoardCard[] = scouterRows.map((s) => ({
    scouterId: s.id,
    name: s.name,
    unitId: draftByScouter.get(s.id) ?? null,
  }));

  // ¿El borrador de ahora mismo es exactamente lo último que se envió? Si
  // es así, no hay nada nuevo que mandar — el botón lo refleja en vez de
  // dejar reenviar un duplicado (ver draftMatchesLatestProposal en actions).
  const latestProposal = await dbGet<{ id: string; submittedAt: string }>(
    "SELECT id, submitted_at AS submittedAt FROM proposals WHERE owner_id = ? ORDER BY submitted_at DESC LIMIT 1",
    [scouter.scouterId],
  );
  let alreadySent = false;
  if (latestProposal) {
    const sentRows = await dbAll<{ scouterId: string; unitId: string }>(
      "SELECT scouter_id AS scouterId, unit_id AS unitId FROM proposal_assignments WHERE proposal_id = ?",
      [latestProposal.id],
    );
    const sentByScouter = new Map(sentRows.map((r) => [r.scouterId, r.unitId]));
    alreadySent =
      draftRows.length === sentRows.length &&
      draftRows.every((r) => sentByScouter.get(r.scouterId) === r.unitId);
  }

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
          Propuesta enviada al kraal. Si mueves algo podrás volver a
          enviarla.
        </p>
      )}
      {error === "already_sent" && (
        <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-foreground">
          Ya se ha enviado esta propuesta tal cual está — mueve algo si
          quieres mandar una versión distinta.
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
        extraActions={
          <SubmitProposalButton
            alreadySent={alreadySent}
            lastSubmittedAt={alreadySent ? latestProposal!.submittedAt : null}
          />
        }
      />
    </main>
  );
}
