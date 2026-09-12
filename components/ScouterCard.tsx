"use client";

import type { BoardCard } from "@/lib/board";

export function ScouterCard({
  card,
  editable,
  selected,
  onSelect,
}: {
  card: BoardCard;
  editable: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      draggable={editable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", card.scouterId);
      }}
      onClick={
        editable
          ? (e) => {
              // Prevent bubbling to the column's "move selected card here"
              // handler — clicking a card should only ever (de)select it.
              e.stopPropagation();
              onSelect();
            }
          : undefined
      }
      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
        selected
          ? "border-accent bg-accent/10 text-foreground"
          : "border-border bg-surface text-foreground"
      } ${editable ? "cursor-pointer hover:border-accent" : "cursor-default"}`}
    >
      {card.name}
    </button>
  );
}
