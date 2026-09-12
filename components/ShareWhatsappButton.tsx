"use client";

import type { BoardCard, BoardUnit } from "@/lib/board";
import { UNASSIGNED_COLUMN_ID } from "@/lib/board";

export function ShareWhatsappButton({
  units,
  cardsByUnit,
  title = "Parrilla Kraal GSSA 151 — 2026/27",
}: {
  units: BoardUnit[];
  cardsByUnit: Map<string, BoardCard[]>;
  title?: string;
}) {
  function buildMessage() {
    const lines = [`*${title}*`, ""];
    for (const unit of units) {
      const names = (cardsByUnit.get(unit.id) ?? []).map((c) => c.name);
      lines.push(`*${unit.name}*: ${names.length ? names.join(", ") : "—"}`);
    }
    const unassigned = (cardsByUnit.get(UNASSIGNED_COLUMN_ID) ?? []).map(
      (c) => c.name,
    );
    if (unassigned.length) {
      lines.push("", `*Sin asignar*: ${unassigned.join(", ")}`);
    }
    return lines.join("\n");
  }

  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(buildMessage())}`}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:border-accent"
    >
      Compartir por WhatsApp
    </a>
  );
}
