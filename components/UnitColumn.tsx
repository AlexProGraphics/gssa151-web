"use client";

import type { BoardCard, BoardUnit } from "@/lib/board";
import { ScouterCard } from "./ScouterCard";

export function UnitColumn({
  unit,
  cards,
  editable,
  selectedId,
  onSelectCard,
  onDropCard,
}: {
  unit: Pick<BoardUnit, "id" | "name" | "color"> | { id: string; name: string; color: string };
  cards: BoardCard[];
  editable: boolean;
  selectedId: string | null;
  onSelectCard: (scouterId: string) => void;
  onDropCard: (scouterId: string, unitId: string) => void;
}) {
  return (
    <div
      className="flex w-64 shrink-0 flex-col gap-2 rounded-xl border border-border bg-surface/40 p-3"
      onDragOver={editable ? (e) => e.preventDefault() : undefined}
      onDrop={
        editable
          ? (e) => {
              e.preventDefault();
              const scouterId = e.dataTransfer.getData("text/plain");
              if (scouterId) onDropCard(scouterId, unit.id);
            }
          : undefined
      }
      onClick={
        editable && selectedId
          ? () => onDropCard(selectedId, unit.id)
          : undefined
      }
    >
      <div className="flex items-center gap-2 px-1">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: unit.color }}
        />
        <h3 className="text-sm font-semibold text-foreground">{unit.name}</h3>
        <span className="ml-auto text-xs text-muted">{cards.length}</span>
      </div>
      <div className="flex min-h-16 flex-col gap-2">
        {cards.map((card) => (
          <ScouterCard
            key={card.scouterId}
            card={card}
            editable={editable}
            selected={selectedId === card.scouterId}
            onSelect={() => onSelectCard(card.scouterId)}
          />
        ))}
      </div>
    </div>
  );
}
